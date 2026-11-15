// /**
//  * RC522 + Raspberry Pi Pico 2 W
//  *
//  * Reports only state changes over USB CDC serial:
//  *   TAG_DETECTED,04AABBCCDD
//  *   TAG_REMOVED,04AABBCCDD
//  *
//  * A present card is scanned continuously but printed only once.
//  * Removal is reported after REMOVAL_TIMEOUT_MS without seeing that card.
//  * If one card is replaced directly by another, removal and detection are
//  * reported back-to-back. Intended for ONE 13.56 MHz Type-A tag at a time.
//  */
// #include <stdbool.h>
// #include <stdint.h>
// #include <stdio.h>
// #include <string.h>

// #include "pico/stdlib.h"
// #include "mfrc522.h"

// #define POLL_INTERVAL_MS      60u
// #define REMOVAL_TIMEOUT_MS  500u

// static bool uid_equal(const Uid *a, const Uid *b) {
//     return a->size == b->size &&
//            a->size > 0 && a->size <= sizeof(a->uidByte) &&
//            memcmp(a->uidByte, b->uidByte, a->size) == 0;
// }

// static void print_uid_event(const char *name, const Uid *tag) {
//     printf("%s,", name);
//     for (uint8_t i = 0; i < tag->size; ++i) {
//         printf("%02X", tag->uidByte[i]);
//     }
//     printf("\n");
//     fflush(stdout);
// }

// /*
//  * Use WUPA, not REQA: unlike REQA, WUPA also finds tags that this
//  * application previously halted using PICC_HaltA(). Without WUPA, a
//  * card held continuously on the reader could be reported as "removed".
//  */
// static bool scan_uid(MFRC522Ptr_t reader, Uid *found) {
//     uint8_t atqa[2];
//     uint8_t atqa_size = sizeof(atqa);
//     StatusCode status = PICC_WakeupA(reader, atqa, &atqa_size);

//     if (status != STATUS_OK && status != STATUS_COLLISION) {
//         return false;
//     }
//     if (!PICC_ReadCardSerial(reader)) {
//         return false;
//     }
//     if (reader->uid.size == 0 || reader->uid.size > 10) {
//         PICC_HaltA(reader);
//         return false;
//     }

//     *found = reader->uid;
//     PICC_HaltA(reader); // Allow it to be woken up again in the next poll.
//     return true;
// }

// int main(void) {
//     stdio_init_all();
//     sleep_ms(1500); // Give the host's USB serial connection time to start.

//     MFRC522Ptr_t reader = MFRC522_Init();
//     if (reader == NULL) {
//         printf("ERROR,MFRC522_INIT_FAILED\n");
//         while (true) sleep_ms(1000);
//     }

//     PCD_Init(reader, spi0);

//     const uint8_t version = PCD_ReadRegister(reader, VersionReg);
//     if (version == 0x00 || version == 0xFF) {
//         printf("ERROR,RC522_NOT_RESPONDING,0x%02X\n", version);
//         while (true) sleep_ms(1000);
//     }
//     // Normal event protocol intentionally has no periodic startup/status logs.
//     printf("Initialization done!!\n");

//     bool tag_present = false;
//     Uid active_uid = {0};
//     uint32_t last_seen_ms = 0;

//     while (true) {
//         printf("Hello, waiting for rfid tag\n");
//         Uid observed_uid = {0};
//         bool seen = scan_uid(reader, &observed_uid);
//         uint32_t now_ms = to_ms_since_boot(get_absolute_time());

//         if (seen) {
//             if (!tag_present) {
//                 active_uid = observed_uid;
//                 tag_present = true;
//                 print_uid_event("TAG_DETECTED", &active_uid);
//             } else if (!uid_equal(&active_uid, &observed_uid)) {
//                 print_uid_event("TAG_REMOVED", &active_uid);
//                 active_uid = observed_uid;
//                 print_uid_event("TAG_DETECTED", &active_uid);
//             }
//             // Same UID: remain silent, but update its last-seen time.
//             last_seen_ms = now_ms;
//         } else if (tag_present &&
//                    (uint32_t)(now_ms - last_seen_ms) >= REMOVAL_TIMEOUT_MS) {
//             print_uid_event("TAG_REMOVED", &active_uid);
//             memset(&active_uid, 0, sizeof(active_uid));
//             tag_present = false;
//         }

//         sleep_ms(POLL_INTERVAL_MS);
//     }
// }


/**
 * Diagnostic RC522 scanner for Raspberry Pi Pico 2 W.
 * Temporarily replace RFID_Project.c with this file's contents.
 * The TAG_DETECTED/TAG_REMOVED event format is preserved.
 * DEBUG lines are temporary and should be removed for the final application.
 */
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "pico/stdlib.h"
#include "mfrc522.h"

#define POLL_INTERVAL_MS       60u
#define REMOVAL_TIMEOUT_MS   500u
#define DEBUG_INTERVAL_MS   1000u

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
 * Repeatedly wake the tag even if it was HALTed by the previous scan.
 * Capture the failure stage instead of silently ignoring it.
 */
static bool scan_uid(MFRC522Ptr_t reader, Uid *found,
                     StatusCode *wake_status, StatusCode *select_status,
                     bool *selection_attempted) {
    uint8_t atqa[2] = {0};
    uint8_t atqa_size = sizeof(atqa);

    *selection_attempted = false;
    *wake_status = PICC_WakeupA(reader, atqa, &atqa_size);

    if (*wake_status != STATUS_OK && *wake_status != STATUS_COLLISION) {
        return false;
    }

    *selection_attempted = true;
    *select_status = PICC_Select(reader, &reader->uid, 0);
    if (*select_status != STATUS_OK) {
        return false;
    }
    if (reader->uid.size == 0 || reader->uid.size > 10) {
        PICC_HaltA(reader);
        return false;
    }

    *found = reader->uid;
    PICC_HaltA(reader);
    return true;
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    MFRC522Ptr_t reader = MFRC522_Init();
    if (!reader) {
        printf("ERROR,MFRC522_INIT_FAILED\n");
        while (true) sleep_ms(1000);
    }

    PCD_Init(reader, spi0);

    uint8_t version = PCD_ReadRegister(reader, VersionReg);
    uint8_t antenna = PCD_ReadRegister(reader, TxControlReg);
    printf("DEBUG,VERSION,0x%02X,TX_CONTROL,0x%02X\n", version, antenna);
    if (version == 0x00 || version == 0xFF) {
        printf("ERROR,RC522_SPI_NOT_RESPONDING\n");
        while (true) sleep_ms(1000);
    }
    if ((antenna & 0x03) != 0x03) {
        printf("WARNING,RC522_ANTENNA_OUTPUTS_NOT_ENABLED\n");
    }

    printf("DEBUG,READY,Hold one 13.56MHz ISO14443A tag flat against the reader\n");
    fflush(stdout);

    bool tag_present = false;
    Uid active_uid = {0};
    uint32_t last_seen_ms = 0;
    uint32_t last_debug_ms = 0;

     while (true) {
        Uid observed_uid = {0};
        StatusCode wake_status = STATUS_INVALID;
        StatusCode select_status = STATUS_INVALID;
        bool selection_attempted = false;

        bool seen = scan_uid(reader, &observed_uid, &wake_status,
                             &select_status, &selection_attempted);
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
            last_seen_ms = now_ms;
        } else if (tag_present &&
                   (uint32_t)(now_ms - last_seen_ms) >= REMOVAL_TIMEOUT_MS) {
            print_uid_event("TAG_REMOVED", &active_uid);
            memset(&active_uid, 0, sizeof(active_uid));
            tag_present = false;
        }

        // One diagnostic message per second while not successfully reading a tag.
        if (!seen && (uint32_t)(now_ms - last_debug_ms) >= DEBUG_INTERVAL_MS) {
            last_debug_ms = now_ms;
            uint8_t irq = PCD_ReadRegister(reader, ComIrqReg);
            uint8_t err = PCD_ReadRegister(reader, ErrorReg);
            uint8_t tx = PCD_ReadRegister(reader, TxControlReg);
            if (selection_attempted) {
                printf("DEBUG,WUPA,%s,SELECT,%s,IRQ,0x%02X,ERR,0x%02X,TX,0x%02X\n",
                       GetStatusCodeName(wake_status),
                       GetStatusCodeName(select_status), irq, err, tx);
            } else {
                printf("DEBUG,WUPA,%s,SELECT,NOT_ATTEMPTED,IRQ,0x%02X,ERR,0x%02X,TX,0x%02X\n",
                       GetStatusCodeName(wake_status), irq, err, tx);
            }
            fflush(stdout);
        }

        sleep_ms(POLL_INTERVAL_MS);
    }
}
