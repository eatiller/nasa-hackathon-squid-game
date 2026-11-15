/**
 * RC522 + Raspberry Pi Pico 2 W
 *
 * Reports only state changes over USB CDC serial:
 *   TAG_DETECTED,04AABBCCDD
 *   TAG_REMOVED,04AABBCCDD
 *
 * A present card is scanned continuously but printed only once.
 * Removal is reported after REMOVAL_TIMEOUT_MS without seeing that card.
 * If one card is replaced directly by another, removal and detection are
 * reported back-to-back. Intended for ONE 13.56 MHz Type-A tag at a time.
 */
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "pico/stdlib.h"
#include "mfrc522.h"

#define POLL_INTERVAL_MS      60u
#define REMOVAL_TIMEOUT_MS  500u

static bool uid_equal(const Uid *a, const Uid *b) {
    return a->size == b->size &&
           a->size > 0 && a->size <= sizeof(a->uidByte) &&
           memcmp(a->uidByte, b->uidByte, a->size) == 0;
}

static void print_uid_event(const char *name, const Uid *tag) {
    printf("%s,", name);
    for (uint8_t i = 0; i < tag->size; ++i) {
        printf("%02X", tag->uidByte[i]);
    }
    printf("\n");
    fflush(stdout);
}

/*
 * Use WUPA, not REQA: unlike REQA, WUPA also finds tags that this
 * application previously halted using PICC_HaltA(). Without WUPA, a
 * card held continuously on the reader could be reported as "removed".
 */
static bool scan_uid(MFRC522Ptr_t reader, Uid *found) {
    uint8_t atqa[2];
    uint8_t atqa_size = sizeof(atqa);
    StatusCode status = PICC_WakeupA(reader, atqa, &atqa_size);

    if (status != STATUS_OK && status != STATUS_COLLISION) {
        return false;
    }
    if (!PICC_ReadCardSerial(reader)) {
        return false;
    }
    if (reader->uid.size == 0 || reader->uid.size > 10) {
        PICC_HaltA(reader);
        return false;
    }

    *found = reader->uid;
    PICC_HaltA(reader); // Allow it to be woken up again in the next poll.
    return true;
}

int main(void) {
    stdio_init_all();
    sleep_ms(1500); // Give the host's USB serial connection time to start.

    MFRC522Ptr_t reader = MFRC522_Init();
    if (reader == NULL) {
        printf("ERROR,MFRC522_INIT_FAILED\n");
        while (true) sleep_ms(1000);
    }

    PCD_Init(reader, spi0);

    const uint8_t version = PCD_ReadRegister(reader, VersionReg);
    if (version == 0x00 || version == 0xFF) {
        printf("ERROR,RC522_NOT_RESPONDING,0x%02X\n", version);
        while (true) sleep_ms(1000);
    }
    // Normal event protocol intentionally has no periodic startup/status logs.

    bool tag_present = false;
    Uid active_uid = {0};
    uint32_t last_seen_ms = 0;

    while (true) {
        Uid observed_uid = {0};
        bool seen = scan_uid(reader, &observed_uid);
        uint32_t now_ms = to_ms_since_boot(get_absolute_time());

        if (seen) {
            if (!tag_present) {
                active_uid = observed_uid;
                tag_present = true;
                print_uid_event("TAG_DETECTED", &active_uid);
            } else if (!uid_equal(&active_uid, &observed_uid)) {
                print_uid_event("TAG_REMOVED", &active_uid);
                active_uid = observed_uid;
                print_uid_event("TAG_DETECTED", &active_uid);
            }
            // Same UID: remain silent, but update its last-seen time.
            last_seen_ms = now_ms;
        } else if (tag_present &&
                   (uint32_t)(now_ms - last_seen_ms) >= REMOVAL_TIMEOUT_MS) {
            print_uid_event("TAG_REMOVED", &active_uid);
            memset(&active_uid, 0, sizeof(active_uid));
            tag_present = false;
        }

        sleep_ms(POLL_INTERVAL_MS);
    }
}
