package com.crewlabs.soulsvisionlab;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.RectF;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.mlkit.vision.MlKitAnalyzer;
import androidx.camera.view.LifecycleCameraController;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

import com.google.mlkit.vision.objects.DetectedObject;
import com.google.mlkit.vision.objects.ObjectDetection;
import com.google.mlkit.vision.objects.ObjectDetector;
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Standalone CameraX + official MlKitAnalyzer / ML Kit object tracking experiment.
 * No Gemini, no Souls persistence, no WebView, no video uploads, no recording.
 */
public final class MainActivity extends ComponentActivity {
    private final PresenceController presence = new PresenceController();
    private final ArrayDeque<Long> resultTimes = new ArrayDeque<>();
    private final StringBuilder csv = new StringBuilder(
            "elapsed_ms,event,target_id,observed_id,state,box_left,box_top,box_right,box_bottom,result_fps,center_step_pct,missed_frames\n");

    private PreviewView preview;
    private TrackingOverlay overlay;
    private TextView status;
    private TextView metrics;
    private LifecycleCameraController controller;
    private ObjectDetector detector;
    private ExecutorService analysisExecutor;
    private RectF candidateBox;
    private Integer candidateId;
    private long firstResultAtMs = -1;
    private long lastUiAtMs = 0;
    private int callbackCount = 0;
    private int loggedRows = 0;
    private float previousCenterX = Float.NaN;
    private float previousCenterY = Float.NaN;
    private float accumulatedCenterStep = 0;
    private int measuredSteps = 0;

    private final ActivityResultLauncher<String> permissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                if (granted) startCamera();
                else setStatus("需要相機權限，請到系統設定允許後重試。");
            });

    private final ActivityResultLauncher<String> exportLauncher =
            registerForActivityResult(new ActivityResultContracts.CreateDocument("text/csv"), this::saveCsv);

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xFF111521);
        getWindow().setNavigationBarColor(0xFF111521);
        createLayout();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) startCamera();
        else permissionLauncher.launch(Manifest.permission.CAMERA);
    }

    private void createLayout() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF111521);
        preview = new PreviewView(this);
        preview.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        preview.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        root.addView(preview, new FrameLayout.LayoutParams(-1, -1));

        overlay = new TrackingOverlay(this);
        overlay.setTapListener(this::lockAt);
        root.addView(overlay, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(dp(13), dp(10), dp(13), dp(12));
        header.setBackgroundColor(0xD91A202C);

        TextView title = label("CREW SOULS · NATIVE TRACKING LAB", 12, 0xFFFFAF36);
        title.setTypeface(null, 1);
        header.addView(title);

        status = label("等待相機啟動…", 14, Color.WHITE);
        header.addView(status);

        metrics = label("結果 FPS — · 尚未鎖定", 12, 0xFFDEE3F1);
        header.addView(metrics);

        FrameLayout.LayoutParams headerParams =
                new FrameLayout.LayoutParams(-1, -2, Gravity.TOP);
        headerParams.topMargin = dp(29);
        headerParams.leftMargin = dp(10);
        headerParams.rightMargin = dp(10);
        root.addView(header, headerParams);

        LinearLayout footer = new LinearLayout(this);
        footer.setOrientation(LinearLayout.VERTICAL);
        footer.setPadding(dp(10), dp(10), dp(10), dp(10));
        footer.setBackgroundColor(0xEC1A202C);
        TextView tip = label("對準單一物品，點擊偵測框鎖定；移開物品觀察追蹤 ID 是否消失。", 12, 0xFFE6E3DF);
        footer.addView(tip);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button lock = actionButton("鎖定物品", 0xFFFF9A00);
        lock.setOnClickListener(v -> lockCandidate());
        Button reset = actionButton("重新選擇", 0xFF5C6678);
        reset.setOnClickListener(v -> resetTarget());
        Button export = actionButton("匯出 CSV", 0xFF5C6678);
        export.setOnClickListener(v -> exportLauncher.launch("crew-souls-vision-lab.csv"));

        actions.addView(lock, weightParams());
        actions.addView(reset, weightParams());
        actions.addView(export, weightParams());
        footer.addView(actions);
        FrameLayout.LayoutParams footerParams =
                new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        footerParams.bottomMargin = dp(32);
        footerParams.leftMargin = dp(10);
        footerParams.rightMargin = dp(10);
        root.addView(footer, footerParams);
        setContentView(root);
    }

    private void startCamera() {
        if (detector != null) return;
        setStatus("啟動 CameraX + ML Kit，首次可能需要下載偵測模型…");
        try {
            ObjectDetectorOptions options = new ObjectDetectorOptions.Builder()
                    .setDetectorMode(ObjectDetectorOptions.STREAM_MODE)
                    // Official guidance: one prominent object for realtime performance.
                    .build();
            detector = ObjectDetection.getClient(options);
            analysisExecutor = Executors.newSingleThreadExecutor();

            controller = new LifecycleCameraController(this);
            controller.setCameraSelector(CameraSelector.DEFAULT_BACK_CAMERA);
            controller.setEnabledUseCases(LifecycleCameraController.IMAGE_ANALYSIS);
            controller.setImageAnalysisBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST);
            controller.setImageAnalysisAnalyzer(analysisExecutor,
                    new MlKitAnalyzer(Collections.singletonList(detector),
                            ImageAnalysis.COORDINATE_SYSTEM_VIEW_REFERENCED,
                            getMainExecutor(), this::onDetection));

            preview.setController(controller);
            controller.bindToLifecycle(this);
            setStatus("相機已啟動。等待 ML Kit 的物品偵測框…");
        } catch (Exception e) {
            setStatus("無法啟動相機／偵測器：" + e.getClass().getSimpleName());
        }
    }

    /** Already in PreviewView coordinates: never manually scale or rotate ML Kit's box. */
    private void onDetection(MlKitAnalyzer.Result result) {
        if (isFinishing() || isDestroyed()) return;
        Throwable failure = result.getThrowable(detector);
        if (failure != null) {
            // A model/network error is not evidence that the physical object left the view.
            overlay.update(null, null, presence.getTargetId(), presence.getState());
            setStatus("模型尚未準備或偵測失敗：" + failure.getClass().getSimpleName()
                    + "。請確認 Google Play 服務與網路。");
            return;
        }

        long nowMs = SystemClock.elapsedRealtime();
        if (firstResultAtMs < 0) firstResultAtMs = nowMs;
        callbackCount++;
        resultTimes.addLast(nowMs);
        while (!resultTimes.isEmpty() && nowMs - resultTimes.peekFirst() > 1800)
            resultTimes.removeFirst();
        float fps = 0;
        if (resultTimes.size() >= 2) {
            long span = nowMs - resultTimes.peekFirst();
            if (span > 0) fps = (resultTimes.size() - 1) * 1000f / span;
        }

        List<DetectedObject> results = result.getValue(detector);
        DetectedObject dominant = null;
        long maxArea = 0;
        if (results != null) for (DetectedObject object : results) {
            if (object.getBoundingBox() == null || object.getBoundingBox().isEmpty()) continue;
            long area = (long) object.getBoundingBox().width() * object.getBoundingBox().height();
            if (area > maxArea) { dominant = object; maxArea = area; }
        }
        // If more than one detection is ever returned, do not override a selected ID.
        Integer lockedId = presence.getTargetId();
        if (lockedId != null && results != null) for (DetectedObject object : results) {
            if (lockedId.equals(object.getTrackingId()) && !object.getBoundingBox().isEmpty()) {
                dominant = object;
                break;
            }
        }
        candidateId = dominant == null ? null : dominant.getTrackingId();
        candidateBox = dominant == null ? null : new RectF(dominant.getBoundingBox());

        PresenceController.State next = presence.observe(candidateId, nowMs);
        overlay.update(candidateBox, candidateId, presence.getTargetId(), next);
        boolean same = lockedId != null && lockedId.equals(candidateId) && candidateBox != null;

        float stepPercent = 0;
        if (same) {
            float cx = candidateBox.centerX(), cy = candidateBox.centerY();
            if (!Float.isNaN(previousCenterX)) {
                float diag = (float) Math.hypot(preview.getWidth(), preview.getHeight());
                if (diag > 0) {
                    stepPercent = 100f * (float) Math.hypot(cx - previousCenterX, cy - previousCenterY) / diag;
                    accumulatedCenterStep += stepPercent;
                    measuredSteps++;
                }
            }
            previousCenterX = cx;
            previousCenterY = cy;
        } else {
            previousCenterX = Float.NaN;
            previousCenterY = Float.NaN;
        }
        record(nowMs, next, fps, stepPercent);

        if (nowMs - lastUiAtMs >= 250) {
            lastUiAtMs = nowMs;
            showStatus(next, fps, nowMs);
        }
    }

    private void showStatus(PresenceController.State state, float fps, long now) {
        String message;
        switch (state) {
            case TRACKING: message = "追蹤中 · ID #" + presence.getTargetId() + "；橘色眼睛代表鎖定物品"; break;
            case OCCLUDED: message = "物品暫時未找到（" + presence.getAbsentMs(now) + "ms），保留原 ID"; break;
            case LOST: message = "目標疑似離開鏡頭。請重新鎖定，或測試 ID 是否回復。"; break;
            default:
                message = candidateBox == null
                        ? "尚未偵測到物品；請靠近、增加光線與表面對比。"
                        : candidateId == null ? "已找到偵測框；等待 ML Kit 提供追蹤 ID。"
                        : "偵測到 ID #" + candidateId + "；請點框或按「鎖定物品」。";
        }
        setStatus(message);
        float averageStep = measuredSteps == 0 ? 0 : accumulatedCenterStep / measuredSteps;
        metrics.setText(String.format(Locale.TAIWAN,
                "結果 %.1f FPS｜回呼 %d｜追蹤 %d 幀｜遺失 %d 次｜其他 ID %d 次\n相鄰中心位移平均 %.2f%%（包含實際移動）",
                fps, callbackCount, presence.getSeenFrames(), presence.getLossEvents(),
                presence.getForeignIdEvents(), averageStep));
    }

    private void record(long now, PresenceController.State state, float fps, float step) {
        if (loggedRows >= 6000) return;
        loggedRows++;
        long elapsed = firstResultAtMs < 0 ? 0 : now - firstResultAtMs;
        csv.append(elapsed).append(",frame,")
                .append(presence.getTargetId() == null ? "" : presence.getTargetId())
                .append(",")
                .append(candidateId == null ? "" : candidateId)
                .append(",").append(state.name()).append(",");
        if (candidateBox != null) {
            csv.append(Math.round(candidateBox.left)).append(",")
                    .append(Math.round(candidateBox.top)).append(",")
                    .append(Math.round(candidateBox.right)).append(",")
                    .append(Math.round(candidateBox.bottom));
        } else csv.append(",,,");
        csv.append(",").append(String.format(Locale.US, "%.1f,%.3f,%d\n",
                fps, step, presence.getMissingFrames()));
    }

    private void lockAt(float x, float y) {
        if (candidateBox == null || candidateId == null || !candidateBox.contains(x, y)) {
            setStatus("請點偵測框裡面（目前沒有可鎖定的 Tracking ID）。");
            return;
        }
        lockCandidate();
    }

    private void lockCandidate() {
        if (candidateId == null || candidateBox == null) {
            setStatus("還沒有可鎖定的 Tracking ID。請讓物品佔畫面較大的區域。");
            return;
        }
        presence.lock(candidateId, SystemClock.elapsedRealtime());
        accumulatedCenterStep = 0;
        measuredSteps = 0;
        previousCenterX = Float.NaN;
        overlay.update(candidateBox, candidateId, presence.getTargetId(), presence.getState());
        setStatus("已鎖定追蹤 ID #" + candidateId + "；慢慢移動或轉動物品。");
    }

    private void resetTarget() {
        presence.clear();
        previousCenterX = Float.NaN;
        accumulatedCenterStep = 0;
        measuredSteps = 0;
        overlay.update(candidateBox, candidateId, null, PresenceController.State.SEARCHING);
        setStatus("已解除鎖定；請重新選擇物品。");
    }

    private void saveCsv(Uri uri) {
        if (uri == null) return;
        try (OutputStream stream = getContentResolver().openOutputStream(uri)) {
            if (stream == null) throw new IllegalStateException("No output stream");
            stream.write(csv.toString().getBytes(StandardCharsets.UTF_8));
            setStatus("CSV 已存到選擇的位置，共 " + loggedRows + " 筆結果（不包含相機影像）。");
        } catch (Exception e) {
            setStatus("CSV 寫入失敗：" + e.getClass().getSimpleName());
        }
    }

    private void setStatus(String text) {
        if (status != null) status.setText(text);
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private TextView label(String text, int sp, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(color);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        view.setPadding(dp(4), dp(4), dp(4), dp(4));
        return view;
    }

    private Button actionButton(String text, int color) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextColor(color == 0xFFFF9A00 ? 0xFF221704 : Color.WHITE);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(color));
        button.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        button.setMinHeight(dp(44));
        return button;
    }

    private LinearLayout.LayoutParams weightParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, dp(52), 1f);
        params.setMargins(dp(2), dp(5), dp(2), dp(2));
        return params;
    }

    @Override protected void onStop() {
        super.onStop();
        // CameraX stops with lifecycle; a new session must explicitly relock its ID.
        presence.clear();
        if (overlay != null) overlay.clear();
        candidateBox = null;
        candidateId = null;
    }

    @Override protected void onDestroy() {
        if (controller != null) controller.clearImageAnalysisAnalyzer();
        if (detector != null) detector.close();
        if (analysisExecutor != null) analysisExecutor.shutdown();
        super.onDestroy();
    }
}
