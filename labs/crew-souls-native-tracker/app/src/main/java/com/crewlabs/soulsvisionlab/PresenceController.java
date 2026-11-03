package com.crewlabs.soulsvisionlab;

/**
 * Pure state machine for a single ML Kit STREAM_MODE tracking ID.
 * An ID belongs to a camera session only: it is NOT a Soul identity.
 *
 * A timeout measures missing detector results, not definite physical removal.
 * Failures to run the model must not be fed here as "object missing".
 */
public final class PresenceController {
    public enum State { SEARCHING, TRACKING, OCCLUDED, LOST }

    public static final long LOST_AFTER_MS = 1200L;
    public static final int LOST_AFTER_MISSES = 3;

    private Integer targetId;
    private State state = State.SEARCHING;
    private long lockedAtMs = -1;
    private long lastSeenAtMs = -1;
    private int seenFrames;
    private int missingFrames;
    private int lossEvents;
    private int foreignIdEvents;
    private Integer lastForeignId;

    public void lock(int id, long nowMs) {
        targetId = id;
        state = State.TRACKING;
        lockedAtMs = nowMs;
        lastSeenAtMs = nowMs;
        seenFrames = 0;
        missingFrames = 0;
        lossEvents = 0;
        foreignIdEvents = 0;
        lastForeignId = null;
    }

    public void clear() {
        targetId = null;
        state = State.SEARCHING;
        lockedAtMs = -1;
        lastSeenAtMs = -1;
        seenFrames = 0;
        missingFrames = 0;
        lossEvents = 0;
        foreignIdEvents = 0;
        lastForeignId = null;
    }

    public State observe(Integer observedId, long nowMs) {
        if (targetId == null) return state = State.SEARCHING;

        if (targetId.equals(observedId)) {
            seenFrames++;
            missingFrames = 0;
            lastForeignId = null;
            lastSeenAtMs = nowMs;
            return state = State.TRACKING;
        }

        if (observedId != null && !observedId.equals(lastForeignId)) {
            // An unrelated object's ID is not permission to switch identity.
            foreignIdEvents++;
            lastForeignId = observedId;
        }
        missingFrames++;
        boolean overdue = lastSeenAtMs >= 0 && nowMs - lastSeenAtMs >= LOST_AFTER_MS;
        if (overdue && missingFrames >= LOST_AFTER_MISSES) {
            if (state != State.LOST) lossEvents++;
            return state = State.LOST;
        }
        return state = State.OCCLUDED;
    }

    public State getState() { return state; }
    public Integer getTargetId() { return targetId; }
    public int getSeenFrames() { return seenFrames; }
    public int getMissingFrames() { return missingFrames; }
    public int getLossEvents() { return lossEvents; }
    public int getForeignIdEvents() { return foreignIdEvents; }

    public long getElapsedMs(long nowMs) {
        return lockedAtMs < 0 ? 0 : Math.max(0, nowMs - lockedAtMs);
    }

    public long getAbsentMs(long nowMs) {
        return lastSeenAtMs < 0 ? 0 : Math.max(0, nowMs - lastSeenAtMs);
    }
}
