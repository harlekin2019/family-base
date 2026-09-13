# Family Base

Family Base ist ein gemeinsamer Familienplaner für Kalender, Einkaufslisten, Rezepte, Aufgaben und Putzpläne.

## Installation über Portainer

Voraussetzungen:

- Docker-Umgebung auf Proxmox
- Portainer mit Zugriff auf diese Umgebung
- vorhandener Reverse Proxy mit HTTPS
- eine vorgeschaltete Anmeldung, die eine bestätigte E-Mail-Adresse als HTTP-Header übergibt (z. B. Authentik oder Authelia)
- ein bereits vorhandenes gemeinsames Docker-Netzwerk zwischen Reverse Proxy und Family Base

### Stack aus Git bereitstellen

1. In Portainer **Stacks → Add stack → Repository** öffnen.
2. Die URL dieses GitHub-Projekts eintragen.
3. Als Compose-Datei `compose.portainer.yml` verwenden.
4. Unter Umgebungsvariablen `PROXY_NETWORK` auf den Namen des bestehenden Proxy-Netzwerks setzen.
5. Den Stack bereitstellen.
6. Im Reverse Proxy ein Ziel auf `http://family-base:3000` anlegen und HTTPS erzwingen.

Es wird bewusst kein Host-Port veröffentlicht. Nur Container im gemeinsamen Proxy-Netzwerk können Family Base erreichen.

## Anmeldung am Reverse Proxy

Der vorgeschaltete Anmeldedienst muss mindestens einen dieser E-Mail-Header setzen:

- `X-Auth-Request-Email`
- `Remote-Email`
- `X-Forwarded-Email`

Optional werden `X-Auth-Request-User` und `X-Auth-Request-Name` ausgewertet. Der Reverse Proxy muss eingehende gleichnamige Header von externen Clients entfernen und ausschließlich die vom Anmeldedienst bestätigten Werte neu setzen.

Ohne bestätigten E-Mail-Header verweigert das Backend den Zugriff. Der Container darf deshalb nicht direkt ins Internet veröffentlicht werden.

## Daten und Sicherung

Anwendungsdaten und die lokale D1/SQLite-Datenbank liegen im Docker-Volume `family_base_data`. Für eine Sicherung muss dieses Volume regelmäßig gesichert werden. Datenbankmigrationen werden beim Containerstart automatisch angewendet.

## E-Mail-Erinnerungen

Der Versand ist für Resend vorbereitet. Der Schlüssel wird in Portainer als Umgebungsvariable `RESEND_API_KEY` gesetzt. Absenderadresse, Vorlaufzeit und Aktivierung werden anschließend in der Family-Base-Administration gepflegt.

## Aktualisierung

In Portainer den Stack aus dem Git-Repository erneut abrufen und mit **Pull and redeploy** bereitstellen. Das Datenvolume bleibt dabei erhalten.

## Lokale Entwicklung

```bash
pnpm install
pnpm dev
```

Die gehostete Sites-Version und der Docker-Betrieb verwenden dieselbe Oberfläche, aber unterschiedliche Identitäts- und Laufzeitumgebungen.
