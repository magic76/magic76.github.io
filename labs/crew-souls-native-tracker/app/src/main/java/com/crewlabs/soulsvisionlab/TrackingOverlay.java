package com.crewlabs.soulsvisionlab;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;

/** PreviewView-sized overlay. ML Kit Analyzer already supplies VIEW_REFERENCED rectangles. */
public final class TrackingOverlay extends View {
    public interface TapListener {
        void onTap(float x, float y);
    }

    private final Paint pen = new Paint(Paint.ANTI_ALIAS_FLAG);
    private RectF box;
    private Integer observedId;
    private Integer targetId;
    private PresenceController.State state = PresenceController.State.SEARCHING;
    private TapListener tapListener;

    public TrackingOverlay(Context context) { super(context); setClickable(true); }

    public void setTapListener(TapListener listener) { tapListener = listener; }

    public void update(RectF candidate, Integer observed, Integer selected, PresenceController.State next) {
        box = candidate == null ? null : new RectF(candidate);
        observedId = observed;
        targetId = selected;
        state = next;
        invalidate();
    }

    public void clear() {
        box = null;
        observedId = null;
        targetId = null;
        state = PresenceController.State.SEARCHING;
        invalidate();
    }

    @Override public boolean onTouchEvent(MotionEvent event) {
        if (event.getActionMasked() == MotionEvent.ACTION_UP) {
            if (tapListener != null) tapListener.onTap(event.getX(), event.getY());
            performClick();
            return true;
        }
        return event.getActionMasked() == MotionEvent.ACTION_DOWN || super.onTouchEvent(event);
    }

    @Override public boolean performClick() {
        super.performClick();
        return true;
    }

    private void color(int color, Paint.Style style, float width) {
        pen.setColor(color);
        pen.setStyle(style);
        pen.setStrokeWidth(width);
        pen.setTypeface(null);
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (box == null || box.isEmpty()) return;
        boolean selected = targetId != null && targetId.equals(observedId);
        boolean alive = selected && state == PresenceController.State.TRACKING;
        int border = alive ? Color.rgb(255,154,0) : Color.rgb(116,231,227);
        float line = dp(2.8f);
        color(border, Paint.Style.STROKE, line);
        canvas.drawRoundRect(box, dp(13), dp(13), pen);

        float labelSize = dp(13);
        color(Color.WHITE, Paint.Style.FILL, 1);
        pen.setTextSize(labelSize);
        String label = observedId == null ? "ML Kit · warming up" :
                "ML Kit #" + observedId + (alive ? " · locked" : " · tap to lock");
        float labelW = pen.measureText(label) + dp(20);
        float labelY = Math.max(dp(33), box.top - dp(7));
        color(0xDE171C29, Paint.Style.FILL, 1);
        canvas.drawRoundRect(new RectF(box.left, labelY - dp(23), box.left + labelW, labelY + dp(4)), dp(10), dp(10), pen);
        color(Color.WHITE, Paint.Style.FILL, 1);
        pen.setTextSize(labelSize);
        canvas.drawText(label, box.left + dp(10), labelY - dp(5), pen);

        // The face is only shown while the *selected* tracking ID is present.
        // A different detected object must never inherit this face.
        if (!alive) return;
        float width = box.width(), height = box.height();
        if (width < dp(34) || height < dp(34)) return;
        float centerX = box.centerX();
        float eyesY = box.top + height * .40f;
        float eyeRX = Math.min(width * .10f, height * .10f);
        float eyeRY = Math.min(height * .15f, width * .15f);
        float deltaX = width * .18f;
        drawEye(canvas, centerX - deltaX, eyesY, eyeRX, eyeRY);
        drawEye(canvas, centerX + deltaX, eyesY, eyeRX, eyeRY);

        color(0xDFFF8B9A, Paint.Style.FILL, 1);
        canvas.drawOval(new RectF(centerX - deltaX - eyeRX * 1.8f, eyesY + eyeRY * .5f,
                centerX - deltaX - eyeRX * .8f, eyesY + eyeRY * 1.45f), pen);
        canvas.drawOval(new RectF(centerX + deltaX + eyeRX * .8f, eyesY + eyeRY * .5f,
                centerX + deltaX + eyeRX * 1.8f, eyesY + eyeRY * 1.45f), pen);
        color(Color.WHITE, Paint.Style.STROKE, Math.max(dp(2.3f), eyeRX * .42f));
        RectF mouth = new RectF(centerX - width * .07f, eyesY + eyeRY * 1.0f,
                centerX + width * .07f, eyesY + eyeRY * 2.0f);
        canvas.drawArc(mouth, 15, 150, false, pen);
    }

    private void drawEye(Canvas canvas, float x, float y, float rx, float ry) {
        color(Color.WHITE, Paint.Style.FILL, 1);
        canvas.drawOval(new RectF(x - rx * 1.24f, y - ry * 1.18f, x + rx * 1.24f, y + ry * 1.18f), pen);
        color(0xFF261D35, Paint.Style.FILL, 1);
        canvas.drawOval(new RectF(x - rx, y - ry, x + rx, y + ry), pen);
        color(Color.WHITE, Paint.Style.FILL, 1);
        canvas.drawCircle(x - rx * .27f, y - ry * .30f, Math.max(dp(2), rx * .29f), pen);
    }

    private float dp(float v) { return v * getResources().getDisplayMetrics().density; }
}
