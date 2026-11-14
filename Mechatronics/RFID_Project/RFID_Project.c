// #include <stdio.h>
// #include "pico/stdlib.h"
// #include "hardware/spi.h"

// // SPI Defines
// // We are going to use SPI 0, and allocate it to the following GPIO pins
// // Pins can be changed, see the GPIO function select table in the datasheet for information on GPIO assignments
// #define SPI_PORT spi0
// #define PIN_MISO 16
// #define PIN_CS   17
// #define PIN_SCK  18
// #define PIN_MOSI 19



// int main()
// {
//     stdio_init_all();

//     // SPI initialisation. This example will use SPI at 1MHz.
//     spi_init(SPI_PORT, 1000*1000);
//     gpio_set_function(PIN_MISO, GPIO_FUNC_SPI);
//     gpio_set_function(PIN_CS,   GPIO_FUNC_SIO);
//     gpio_set_function(PIN_SCK,  GPIO_FUNC_SPI);
//     gpio_set_function(PIN_MOSI, GPIO_FUNC_SPI);
    
//     // Chip select is active-low, so we'll initialise it to a driven-high state
//     gpio_set_dir(PIN_CS, GPIO_OUT);
//     gpio_put(PIN_CS, 1);
//     // For more examples of SPI use see https://github.com/raspberrypi/pico-examples/tree/master/spi

//     while (true) {
//         printf("Hello, world!\n");
//         sleep_ms(1000);
//     }
// }


#include <stdio.h>
#include "pico/stdlib.h"
#include "mfrc522.h"

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // Create the reader object
    MFRC522Ptr_t reader = MFRC522_Init();

    // Initialize the physical RC522
    PCD_Init(reader, spi0);

    // Check whether the Pico can communicate with the RC522
    uint8_t version = PCD_ReadRegister(reader, VersionReg);
    printf("RC522 Version: 0x%02X\n", version);

    printf("Waiting for RFID card...\n");

    while (true) {

        // Check if a new card is present
        if (!PICC_IsNewCardPresent(reader)) {
            sleep_ms(100);
            continue;
        }

        // Read the card UID
        if (!PICC_ReadCardSerial(reader)) {
            sleep_ms(100);
            continue;
        }

        // Print the UID
        printf("Card UID: ");

        for (int i = 0; i < reader->uid.size; i++) {
            printf("%02X ", reader->uid.uidByte[i]);
        }

        printf("\n");

        // Put the card into HALT state
        PICC_HaltA(reader);

        sleep_ms(100);
    }
}

