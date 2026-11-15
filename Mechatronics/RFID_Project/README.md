# RC522 RFID reader — Pico 2 W (C/C++ SDK)

A patched version of the provided `mfrc522.c`/`mfrc522.h` library, plus an
application that continuously polls a tag and sends **only changes** to the
computer over USB CDC serial.

## Pin connections

| RC522 pin | Pico 2 W | Note |
| --- | --- | --- |
| 3.3V | 3V3(OUT) | **Never connect VCC to 5V** |
| GND | GND | Common ground |
| RST | GP20 | Reset |
| SDA/SS | GP17 | Chip select, software-controlled |
| SCK | GP18 | SPI0 SCK |
| MOSI | GP19 | SPI0 TX |
| MISO | GP16 | SPI0 RX |
| IRQ | Unconnected | Not used |

The RC522 must be configured for SPI (the usual breakout boards are).
These pin assignments are defined in `mfrc522.h` and currently target **SPI0**.
Do not pass `spi1` without also changing the GPIO pin assignments.

## Build

Requires Raspberry Pi Pico SDK **2.x**, a working C/C++ toolchain, and
`PICO_SDK_PATH` pointing at the Pico SDK. From the project folder:

```sh
cmake -S . -B build -DPICO_BOARD=pico2_w
cmake --build build -j4
```

Flash `build/rc522_pico2w.uf2` by holding **BOOTSEL** while plugging in the
Pico 2 W and copying the UF2 to the RPI-RP2 drive. Then connect the Pico to
your computer with a USB data cable and open its USB serial port. Depending
on your OS it might be e.g. `COM5`, `/dev/ttyACM0`, or `/dev/cu.usbmodem...`.
The serial baud rate selected by the terminal does not matter for USB CDC;
115200 is a conventional choice. Enable line endings as desired.

If communication fails at boot, you may see:

```
ERROR,RC522_NOT_RESPONDING,0x00
```

This is typically a wiring, power, reset, or SPI problem. Check the 3.3 V
supply and pin assignments.

## Serial events

The program prints the hexadecimal **UID**, not arbitrary card memory:

```
TAG_DETECTED,04AABBCCDD
TAG_REMOVED,04AABBCCDD
TAG_DETECTED,137F2918
TAG_REMOVED,137F2918
```

- Scan the same tag continuously: **no repeated serial messages**.
- Remove it: one `TAG_REMOVED` message after approximately **500 ms** without
  successful reads (plus the time of a poll).
- Present it again: another `TAG_DETECTED` message.
- Replace tag A with tag B: `TAG_REMOVED,A` then `TAG_DETECTED,B`.
- A single missed read does **not** cause a removal event.

Configuration values at the top of `main.c`:

```c
#define POLL_INTERVAL_MS      60u
#define REMOVAL_TIMEOUT_MS  500u
```

The reader performs repeated `PICC_WakeupA()` + `PICC_Select()` + `PICC_HaltA()`.
This is important: `PICC_IsNewCardPresent()` uses REQA and cannot see a
previously HALTed tag, so it is unsuitable by itself for detecting removal.

**Scope:** tested for syntax with local SDK mock headers; physical RC522
hardware and a full Pico-SDK build were not available during preparation.
This approach is designed for one ISO/IEC 14443-A **13.56 MHz** tag at a time.
It does not work with 125 kHz RFID tags and does not securely authenticate tag
identity. A UID can sometimes be duplicated; do not use UID alone for security.

## Library fixes included

- Initialize `RESET_PIN` as a GPIO output before pulsing reset.
- Properly respect the selected SPI instance (use `spi0` with the default pins).
- Repair `PCD_ReadNRegister` using a continuous SPI transaction and preserve
  `rxAlign` bits needed for anticollision.
- Stream multi-byte FIFO writes without a stack-allocated variable-length array.
- Initialize chip-select before SPI transactions and consolidate its helper
  definitions inside `mfrc522.c`.
- Stop out-of-bounds allocation in `MFRC522_Init()` after the configured limit.
- Give `PCD_Reset()` and `PCD_SelfTest()` finite timeouts rather than letting
  a disconnected module lock up the firmware indefinitely.
- Guard a null buffer-length argument in `MIFARE_Read()` and avoid copying
  a failed NTAG authentication response.
- Replace unsafe `printf(variable)` cases with `printf("%s", variable)`.

Most higher-level MIFARE Classic and Ultralight functionality is retained from
the supplied library, but advanced tag-writing / UID-rewriting functions have
not been validated on real hardware. The provided `main.c` uses only the
reader's initialization, wake-up, anticollision, selection, and halt APIs.

`PCD_SelfTest()` compares results to the original library's fixed test byte
pattern, which may not be correct for different chip revisions/clones. If you
run it, reinitialize the reader afterward before scanning tags.
