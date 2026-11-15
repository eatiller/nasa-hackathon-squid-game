# RC522 RFID tag scanner — Raspberry Pi Pico 2 W

This Pico SDK C project continuously polls one 13.56 MHz ISO/IEC 14443-A
RFID card/tag. It sends only changes to your computer over USB CDC serial:

```
READY,RC522,VERSION,0x92
TAG_DETECTED,04AABBCCDD
TAG_REMOVED,04AABBCCDD
TAG_DETECTED,137F2918
TAG_REMOVED,137F2918
```

While a tag is left on the antenna, it is read repeatedly but is reported
only once. After 600 ms without a successful read, the firmware reports its
removal. When tag B replaces tag A, it immediately reports `TAG_REMOVED,A`
and `TAG_DETECTED,B`. Intermittent single missed reads are tolerated.

## Wiring (Pico 2 W SPI0)

| RC522 | Pico 2 W | Pico physical pin |
|---|---|---|
| 3.3V | 3V3(OUT) | 36 |
| GND | GND | 23, or any ground |
| SDA / SS | GP17 | 22 |
| SCK | GP18 | 24 |
| MOSI | GP19 | 25 |
| MISO | GP16 | 21 |
| RST | GP20 | 26 |
| IRQ | Not connected | — |

**Do not connect the RC522 to 5 V.** Use a USB data cable to connect the
Pico 2 W to the computer. The RC522 must be an SPI-based 13.56 MHz module;
125 kHz tags cannot be read by it.

## Build and flash

Requires Raspberry Pi Pico SDK 2.x, C/C++ toolchain, and CMake. Set
`PICO_SDK_PATH` to the Pico SDK installation, then run from this folder:

```sh
cmake -S . -B build -DPICO_BOARD=pico2_w
cmake --build build -j4
```

Hold BOOTSEL when connecting the Pico to the computer, then copy
`build/rc522_pico2w.uf2` to the `RPI-RP2` mass-storage drive. When it
reboots, open its USB serial (CDC) port in a serial terminal, e.g. PuTTY,
Thonny serial, or a VS Code serial monitor. 115200 baud is conventional
(but not significant for USB CDC). On Windows it will appear as a COM port.

## Protocol / timing

- `TAG_DETECTED,<UID>` when a tag is first recognized.
- No messages for an unchanged continuously present UID.
- `TAG_REMOVED,<UID>` when the tag has been absent for ~600 ms.
- If tag B replaces tag A, the project outputs removal of A and detection
  of B back-to-back.
- Startup reports `READY,RC522,VERSION,0xXX` or `ERROR,RC522_NOT_READY`.
- If the chip loses its configuration, the firmware attempts to reset and
  reinitialize it, and can report `READY,RC522,RECOVERED`.
- `POLL_INTERVAL_MS`, `REMOVAL_TIMEOUT_MS`, and `HEALTH_CHECK_MS` in `main.c`
  can be adjusted.

This uses `PICC_WakeupA()` instead of `PICC_IsNewCardPresent()`. WUPA can
find a tag that was halted during the preceding scan; REQA only checks for
new/idle tags and is unreliable for monitoring whether a *held* tag remains.

## Troubleshooting

If `VersionReg` reads 0x92, your SPI communications are working at least
for that operation. If scans still fail, verify the RFID tag frequency,
its orientation, supply stability, and wiring. Previous diagnostics showed
registers resetting from `TMode=0x80, TPrescaler=0xA9, TxControl=0x83`
to `TMode=0x00, TPrescaler=0x00, TxControl=0x80` after WUPA. This is
**not** just an expected no-card timeout: it suggests an unexpected reader
reset, brownout, wiring issue, or other malfunction. The code attempts
recovery, but unreliable power or wiring must be fixed physically.

The UID is an identifier, not secure authentication; some tags have
clonable/reprogrammable UIDs. This project is intended to read one tag at
a time, not to distinguish multiple overlapping tags reliably.

The code has not been tested on physical hardware in this environment; a
Pico SDK toolchain is needed for a full hardware build.
