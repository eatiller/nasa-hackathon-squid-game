/**
 * Raspberry Pi Pico 2 W + MFRC522 (RC522) RFID change-only scanner.
 * Pico SDK C; uses the included mfrc522.c/.h driver.
 *
 * USB CDC serial messages (only when something changes):
 *   TAG_DETECTED,04AABBCCDD
 *   TAG_REMOVED,04AABBCCDD
 *
 * A tag held in place does not generate repeated messages.
 * Only one 13.56 MHz ISO14443-A tag is expected in the field at a time.
 */
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "pico/stdlib.h"
#include "mfrc522.h"

#define POLL_INTERVAL_MS       60u
#define REMOVAL_TIMEOUT_MS   600u
#define HEALTH_CHECK_MS      300u

static bool uid_equal(const Uid *a, const Uid *b) {
    return a->size == b->size && a->size > 0 &&
           a->size <= sizeof(a->uidByte) &&
           memcmp(a->uidByte, b->uidByte, a->size) == 0;
}

static void send_event(const char *event, const Uid *uid) {
    printf("%s,", event);
    for (uint8_t i = 0; i < uid->size; ++i) {
        printf("%02X", uid->uidByte[i]);
    }
    printf("\n");
    fflush(stdout);
}

/*
 * After PICC_HaltA(), a tag stays halted while in the field.
 * WUPA (not REQA / IsNewCardPresent) can wake the SAME tag each poll.
 */
static bool read_tag(MFRC522Ptr_t reader, Uid *result) {
    uint8_t atqa[2] = {0};
    uint8_t atqa_size = sizeof(atqa);
    StatusCode s = PICC_WakeupA(reader, atqa, &atqa_size);

    if (s != STATUS_OK && s != STATUS_COLLISION) {
        return false;  // Normally STATUS_TIMEOUT when no tag is nearby.
    }
    if (!PICC_ReadCardSerial(reader)) {
        return false;
    }
    if (reader->uid.size == 0 ||
        reader->uid.size > sizeof(reader->uid.uidByte)) {
        PICC_HaltA(reader);
        return false;
    }

    *result = reader->uid;  // Copy before the next read overwrites reader->uid.
    PICC_HaltA(reader);
    return true;
}

/* Detect a chip that reset or lost configuration unexpectedly. */
static bool reader_configured(MFRC522Ptr_t reader) {
    uint8_t version = PCD_ReadRegister(reader, VersionReg);
    if (version == 0x00 || version == 0xFF) return false;

    return PCD_ReadRegister(reader, TModeReg) == 0x80 &&
           PCD_ReadRegister(reader, TPrescalerReg) == 0xA9 &&
           PCD_ReadRegister(reader, TxASKReg) == 0x40 &&
           PCD_ReadRegister(reader, ModeReg) == 0x3D &&
           (PCD_ReadRegister(reader, TxControlReg) & 0x03) == 0x03;
}

int main(void) {
    stdio_init_all();
    sleep_ms(1500);  // Allow the host to enumerate the USB CDC device.

    MFRC522Ptr_t reader = MFRC522_Init();
    if (!reader) {
        printf("ERROR,MFRC522_ALLOC_FAILED\n");
        while (true) sleep_ms(1000);
    }

    // The included driver sets up SPI0 and RC522 pins:
    // CS=GP17, SCK=GP18, MOSI=GP19, MISO=GP16, RST=GP20.
    PCD_Init(reader, spi0);
    bool reader_ok = reader_configured(reader);
    if (reader_ok) {
        printf("READY,RC522,VERSION,0x%02X\n",
               PCD_ReadRegister(reader, VersionReg));
    } else {
        printf("ERROR,RC522_NOT_READY\n");
    }
    fflush(stdout);

    bool tag_present = false;
    Uid active_uid = {0};
    uint32_t last_seen_ms = 0;
    uint32_t last_health_ms = to_ms_since_boot(get_absolute_time());

    while (true) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        printf("Printing is working\n");

        if (!reader_ok || (uint32_t)(now - last_health_ms) >= HEALTH_CHECK_MS) {
            last_health_ms = now;
            if (!reader_configured(reader)) {
                // If the reader reset (or power briefly dipped), restore all
                // RC522 configuration registers and turn the antenna back on.
                PCD_Init(reader, spi0);
            }
            bool recovered = reader_configured(reader);
            if (recovered && !reader_ok) {
                printf("READY,RC522,RECOVERED\n");
                fflush(stdout);
                // Don't claim a tag was removed during a reader outage.
                if (tag_present) last_seen_ms = now;
            } else if (!recovered && reader_ok) {
                printf("ERROR,RC522_COMMUNICATION_LOST\n");
                fflush(stdout);
            }
            reader_ok = recovered;
        }

        if (reader_ok) {
            Uid observed = {0};
            bool seen = read_tag(reader, &observed);
            now = to_ms_since_boot(get_absolute_time());

            if (seen) {
                if (!tag_present) {
                    active_uid = observed;
                    tag_present = true;
                    send_event("TAG_DETECTED", &active_uid);
                } else if (!uid_equal(&active_uid, &observed)) {
                    send_event("TAG_REMOVED", &active_uid);
                    active_uid = observed;
                    send_event("TAG_DETECTED", &active_uid);
                }
                // Same UID: refresh time, but don't send anything.
                last_seen_ms = now;
            } else if (tag_present &&
                       (uint32_t)(now - last_seen_ms) >= REMOVAL_TIMEOUT_MS) {
                // Confirm the reader is still configured. Otherwise a reader
                // reset could be mistaken for the removal of a tag.
                if (reader_configured(reader)) {
                    send_event("TAG_REMOVED", &active_uid);
                    memset(&active_uid, 0, sizeof(active_uid));
                    tag_present = false;
                } else {
                    reader_ok = false;
                }
            }
        }

        sleep_ms(POLL_INTERVAL_MS);
    }
}
