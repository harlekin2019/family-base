# Family Base für Android

Native Android-App mit drei Startbildschirm-Widgets für Einkaufsliste, Aufgaben und Putzplan. Die App verwendet ausschließlich den eigenen Family-Base-Server.

## Einrichtung

1. Projektordner `android` in Android Studio öffnen und synchronisieren.
2. App auf einem Gerät mit Android 8 oder neuer installieren.
3. In Family Base unter **Administration > Smartphone & Widgets** einen Gerätezugang erzeugen.
4. HTTPS-Adresse des eigenen Family-Base-Servers und den einmal sichtbaren Gerätezugang in der App eintragen.
5. Auf dem Android-Startbildschirm eines oder mehrere Family-Base-Widgets hinzufügen.

Der Gerätezugang wird mit Android Keystore AES/GCM verschlüsselt gespeichert. HTTP ohne TLS wird abgewiesen. Die Widgets aktualisieren sich beim Antippen, nach Änderungen und regelmäßig über WorkManager.

Der Aktualisierungsabstand kann in der App auf 15 Minuten, 30 Minuten, 1 Stunde oder 3 Stunden eingestellt werden. Android kann Hintergrundarbeit zur Schonung des Akkus etwas verzögern.
