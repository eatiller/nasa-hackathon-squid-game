
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

// RC522 pin connections
#define SS_PIN 10
#define RST_PIN 9

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
    Serial.begin(115200);

    // Wait for Serial Monitor
    while (!Serial) {
        delay(10);
    }

    Serial.println("Starting RFID Reader...");

    // Initialize SPI
    SPI.begin();

    // Initialize RC522
    rfid.PCD_Init();

    Serial.println("RFID Reader Ready!");
    Serial.println("Waiting for RFID card...");

    // Print reader firmware version
    rfid.PCD_DumpVersionToSerial();
}

void loop() {
    // Check for a new RFID card
    if (!rfid.PICC_IsNewCardPresent()) {
        return;
    }

    // Read the card UID
    if (!rfid.PICC_ReadCardSerial()) {
        return;
    }

    // Card detected
    Serial.println("-------------------------");
    Serial.println("RFID CARD DETECTED!");

    // Print UID
    Serial.print("Card UID: ");

    for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) {
            Serial.print("0");
        }

        Serial.print(rfid.uid.uidByte[i], HEX);
        Serial.print(" ");
    }

    Serial.println();
    Serial.println("-------------------------");

    // Stop communication with card
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
}
