# Family Base

Family Base ist ein gemeinsamer Familienplaner für Kalender, Einkaufslisten, Rezepte, Aufgaben und Putzpläne.

## Installation über Portainer

Voraussetzungen:

- Docker-Umgebung auf Proxmox
- Portainer mit Zugriff auf diese Umgebung
- Nginx Proxy Manager in einer eigenen Proxmox-VM
- beide VMs sind über die Proxmox-Bridge beziehungsweise das lokale Netzwerk erreichbar
- eine Domain, die auf Nginx Proxy Manager zeigt

### Stack aus Git bereitstellen

1. In Portainer **Stacks → Add stack → Repository** öffnen.
2. Als Repository `https://github.com/harlekin2019/family-base.git` eintragen.
3. Als Referenz `refs/heads/main` und als Compose-Datei `compose.portainer.yml` verwenden.
4. Unter Umgebungsvariablen `FAMILY_BASE_BIND_IP` auf die LAN-IP der Portainer-/Docker-VM setzen.
5. `FAMILY_BASE_PORT` auf `3000` und `TZ` auf `Europe/Berlin` setzen.
6. Optional `RESEND_API_KEY` für E-Mail-Erinnerungen hinterlegen.
7. Den Stack bereitstellen.
8. Die Anwendung im LAN über `http://<FAMILY_BASE_BIND_IP>:3000/api/health` prüfen. Die Antwort muss `status: ok` enthalten.

Das frühere Docker-Netzwerk `PROXY_NETWORK` wird bei getrennten VMs nicht verwendet. Port 3000 wird als Ziel für Nginx Proxy Manager an der LAN-IP der Family-Base-VM veröffentlicht.

### Nginx Proxy Manager in der separaten VM

Unter **Hosts → Proxy Hosts → Add Proxy Host**:

- Domain Names: die gewünschte Family-Base-Domain
- Scheme: `http`
- Forward Hostname / IP: LAN-IP der Portainer-/Docker-VM
- Forward Port: `3000`
- Websockets Support: aktivieren
- Block Common Exploits: aktivieren

Unter **SSL** ein Let's-Encrypt-Zertifikat anfordern und **Force SSL**, **HTTP/2 Support** und **HSTS Enabled** aktivieren.

## Anmeldung am Reverse Proxy

Family Base akzeptiert im Docker-Betrieb nur eine durch den Reverse Proxy bestätigte E-Mail-Adresse. Mit der integrierten Nginx-Proxy-Manager-Zugriffsliste lässt sich das ohne weiteren Dienst einrichten:

1. Unter **Access Lists** eine Liste `Family Base` anlegen.
2. Unter **Authorization** für jedes Familienmitglied einen Benutzer anlegen. Als Benutzernamen die jeweilige vollständige E-Mail-Adresse verwenden.
3. Diese Access List dem Family-Base-Proxy-Host zuordnen.
4. Im Reiter **Advanced** des Proxy Hosts eintragen:

```nginx
proxy_set_header X-Auth-Request-Email $remote_user;
proxy_set_header X-Auth-Request-User $remote_user;
proxy_set_header X-Forwarded-Email $remote_user;
```

Wenn die Android-App verwendet wird, muss deren token-geschützte Schnittstelle von der Browser-Anmeldung ausgenommen werden. Zusätzlich im Reiter **Advanced** eintragen und die Beispiel-IP ersetzen:

```nginx
location ^~ /api/mobile {
    auth_basic off;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://192.168.1.50:3000;
}
```

Die mobile Schnittstelle bleibt durch den widerrufbaren Gerätezugang geschützt. Alle normalen Webseitenaufrufe bleiben hinter der Nginx-Proxy-Manager-Zugriffsliste.

Alternativ kann Authentik oder Authelia mindestens einen dieser E-Mail-Header setzen:

- `X-Auth-Request-Email`
- `Remote-Email`
- `X-Forwarded-Email`

Optional werden `X-Auth-Request-User` und `X-Auth-Request-Name` ausgewertet. Der Reverse Proxy muss eingehende gleichnamige Header von externen Clients entfernen und ausschließlich die vom Anmeldedienst bestätigten Werte neu setzen.

Ohne bestätigten E-Mail-Header verweigert das Web-Backend den Zugriff. Port `3000` darf deshalb nicht über den Internet-Router weitergeleitet werden. Von außen werden ausschließlich die HTTPS-Ports von Nginx Proxy Manager verwendet.

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
