package com.crewlabs.soulsvisionlab;

import org.junit.Test;
import static org.junit.Assert.*;

public final class PresenceControllerTest {
    @Test public void targetMustBeExplicitlyLocked() {
        PresenceController p = new PresenceController();
        assertEquals(PresenceController.State.SEARCHING, p.observe(7, 100));
        assertNull(p.getTargetId());
        p.lock(7, 100);
        assertEquals(PresenceController.State.TRACKING, p.observe(7, 150));
        assertEquals(Integer.valueOf(7), p.getTargetId());
    }

    @Test public void briefOcclusionDoesNotBecomeLost() {
        PresenceController p = new PresenceController();
        p.lock(7, 100);
        assertEquals(PresenceController.State.OCCLUDED, p.observe(null, 220));
        assertEquals(PresenceController.State.OCCLUDED, p.observe(null, 380));
        assertEquals(PresenceController.State.TRACKING, p.observe(7, 490));
        assertEquals(0, p.getLossEvents());
    }

    @Test public void sustainedMissingReportsLostExactlyOnce() {
        PresenceController p = new PresenceController();
        p.lock(7, 100);
        p.observe(null, 200);
        p.observe(null, 650);
        assertEquals(PresenceController.State.LOST, p.observe(null, 1400));
        assertEquals(PresenceController.State.LOST, p.observe(null, 2000));
        assertEquals(1, p.getLossEvents());
        assertEquals(1900, p.getAbsentMs(2000));
    }

    @Test public void anotherObjectNeverSilentlyReplacesSelectedId() {
        PresenceController p = new PresenceController();
        p.lock(7, 100);
        assertEquals(PresenceController.State.OCCLUDED, p.observe(11, 400));
        assertEquals(PresenceController.State.LOST, p.observe(11, 1500));
        assertEquals(Integer.valueOf(7), p.getTargetId());
        assertEquals(1, p.getForeignIdEvents());
    }

    @Test public void trackingIdCanReappearAndRecover() {
        PresenceController p = new PresenceController();
        p.lock(7, 100);
        p.observe(null, 200);
        p.observe(null, 400);
        p.observe(null, 1500);
        assertEquals(PresenceController.State.TRACKING, p.observe(7, 1600));
        assertEquals(0, p.getMissingFrames());
        assertEquals(1, p.getLossEvents());
    }

    @Test public void resetClearsOldRun() {
        PresenceController p = new PresenceController();
        p.lock(4, 0);
        p.observe(null, 100);
        p.clear();
        assertNull(p.getTargetId());
        assertEquals(0, p.getMissingFrames());
        assertEquals(PresenceController.State.SEARCHING, p.getState());
    }

    @Test public void elapsedTimesAreNonNegative() {
        PresenceController p = new PresenceController();
        assertEquals(0L, p.getElapsedMs(1));
        p.lock(8, 1000);
        assertEquals(0L, p.getAbsentMs(500));
        assertEquals(500L, p.getElapsedMs(1500));
    }
}
