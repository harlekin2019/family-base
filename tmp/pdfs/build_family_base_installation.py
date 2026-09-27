from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, KeepTogether, ListFlowable, ListItem
)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "Family-Base-Installationsanleitung.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path(r"C:\Windows\Fonts")
pdfmetrics.registerFont(TTFont("FB-Regular", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("FB-Bold", str(FONT_DIR / "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("FB-Italic", str(FONT_DIR / "ariali.ttf")))

PAGE_W, PAGE_H = A4
INK = colors.HexColor("#F5F7F2")
MUTED = colors.HexColor("#A7B0A3")
DARK = colors.HexColor("#111714")
PANEL = colors.HexColor("#1B231F")
PANEL_2 = colors.HexColor("#222D27")
GREEN = colors.HexColor("#B9F34A")
GREEN_DARK = colors.HexColor("#4D7114")
RED = colors.HexColor("#FF7777")
BLUE = colors.HexColor("#7CC8FF")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleFB", fontName="FB-Bold", fontSize=28, leading=32, textColor=INK, spaceAfter=8))
styles.add(ParagraphStyle(name="SubTitleFB", fontName="FB-Regular", fontSize=12, leading=18, textColor=MUTED))
styles.add(ParagraphStyle(name="H1FB", fontName="FB-Bold", fontSize=21, leading=25, textColor=INK, spaceBefore=5, spaceAfter=11))
styles.add(ParagraphStyle(name="H2FB", fontName="FB-Bold", fontSize=14, leading=18, textColor=GREEN, spaceBefore=10, spaceAfter=6, keepWithNext=True))
styles.add(ParagraphStyle(name="H3FB", fontName="FB-Bold", fontSize=11, leading=15, textColor=INK, spaceBefore=7, spaceAfter=4, keepWithNext=True))
styles.add(ParagraphStyle(name="BodyFB", fontName="FB-Regular", fontSize=9.4, leading=14, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="SmallFB", fontName="FB-Regular", fontSize=8, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name="TinyFB", fontName="FB-Regular", fontSize=7.2, leading=9.2, textColor=MUTED))
styles.add(ParagraphStyle(name="CodeFB", fontName="Courier", fontSize=7.8, leading=11, textColor=INK, backColor=PANEL_2, borderColor=colors.HexColor("#354139"), borderWidth=.5, borderPadding=7, spaceBefore=3, spaceAfter=8))
styles.add(ParagraphStyle(name="CalloutFB", fontName="FB-Regular", fontSize=9, leading=13, textColor=INK, backColor=PANEL_2, borderColor=GREEN_DARK, borderWidth=.8, borderPadding=8, spaceBefore=5, spaceAfter=8))
styles.add(ParagraphStyle(name="CenterFB", fontName="FB-Regular", fontSize=9, leading=14, alignment=TA_CENTER, textColor=MUTED))

def P(text, style="BodyFB"):
    return Paragraph(text, styles[style])

def bullets(items, level=0):
    return ListFlowable(
        [ListItem(P(x), leftIndent=10) for x in items],
        bulletType="bullet", bulletColor=GREEN, bulletFontName="FB-Bold",
        leftIndent=16 + level * 8, bulletFontSize=7, spaceAfter=5
    )

def steps(items):
    return ListFlowable(
        [ListItem(P(x), leftIndent=12) for x in items],
        bulletType="1", start="1", bulletColor=GREEN, bulletFontName="FB-Bold",
        leftIndent=20, bulletFontSize=9, spaceAfter=6
    )

def table(rows, widths, header=True, compact=False):
    cell_style = "TinyFB" if compact else "SmallFB"
    vertical_padding = 4 if compact else 6
    t = Table([[P(str(c), cell_style) for c in r] for r in rows], colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    cmds = [
        ("BACKGROUND", (0,0), (-1,-1), PANEL),
        ("GRID", (0,0), (-1,-1), .45, colors.HexColor("#344039")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), vertical_padding), ("BOTTOMPADDING", (0,0), (-1,-1), vertical_padding),
    ]
    if header:
        cmds += [("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2C382F")), ("TEXTCOLOR", (0,0), (-1,0), GREEN)]
    t.setStyle(TableStyle(cmds))
    return t

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#29332D"))
    canvas.line(18*mm, 15*mm, PAGE_W-18*mm, 15*mm)
    canvas.setFont("FB-Regular", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 9.5*mm, "Family Base - Installationsdokumentation")
    canvas.drawRightString(PAGE_W-18*mm, 9.5*mm, f"Seite {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm,
    topMargin=18*mm, bottomMargin=20*mm, title="Family Base - Installationsdokumentation",
    author="MicWic"
)

story = []
logo = ROOT / "public" / "family-base-logo.png"
if logo.exists():
    story += [Spacer(1, 10*mm), Image(str(logo), width=52*mm, height=52*mm), Spacer(1, 8*mm)]
story += [
    P("Family Base", "TitleFB"),
    P("Detaillierte Installationsdokumentation", "SubTitleFB"),
    Spacer(1, 8*mm),
    P("Bereitstellung auf Proxmox mit Portainer und Nginx Proxy Manager in getrennten VMs.", "H2FB"),
    Spacer(1, 35*mm),
    table([
        ["Dokument", "Angabe"],
        ["Repository", "github.com/harlekin2019/family-base (öffentlich)"],
        ["Stack-Datei", "compose.portainer.yml"],
        ["Proxy-Ziel", "LAN-IP der Family-Base-VM, Port 3000"],
        ["Datenvolume", "family_base_data"],
        ["Zeitzone", "Europe/Berlin"],
        ["Stand", "19. September 2026"],
    ], [42*mm, 112*mm]),
    Spacer(1, 8*mm),
    P("Verfasserhinweis: MicWic", "CenterFB"),
    PageBreak(),
]

story += [P("1. Überblick", "H1FB"),
    P("Diese Anleitung führt von der Vorbereitung bis zur von außen erreichbaren Family-Base-Installation. Die Anwendung wird direkt aus dem öffentlichen GitHub-Projekt durch Portainer gebaut. Anwendungsdaten bleiben in einem Docker-Volume erhalten."),
    P("Zielaufbau", "H2FB"),
    P("Internet -> Nginx Proxy Manager VM mit HTTPS und Anmeldung -> Proxmox-Bridge / LAN -> Family-Base-VM auf Port 3000 -> persistentes Docker-Volume."),
    P("Wichtig", "H2FB"),
    P("Nginx Proxy Manager und Family Base laufen in getrennten VMs. Deshalb wird Port 3000 an der LAN-IP der Family-Base-VM veröffentlicht. Dieser Port darf nicht am Internet-Router freigegeben werden.", "CalloutFB"),
    P("Enthaltene Funktionen", "H2FB"),
    bullets(["Gemeinsamer Kalender und persönliche Kalender", "Einkaufsliste mit umfangreichem Artikelkatalog", "Rezeptverwaltung und URL-Import", "Projekte und Aufgaben", "Putzplan mit Wiederholungen, Rotation und Punkten", "Administration von Familienmitgliedern und E-Mail-Einstellungen"]),
    P("2. Voraussetzungen", "H1FB"),
    bullets(["Laufende Proxmox-Umgebung", "Docker und Portainer in einer eigenen VM oder einem geeigneten LXC", "Nginx Proxy Manager in einer separaten Proxmox-VM", "Beide VMs sind über dieselbe Proxmox-Bridge beziehungsweise das LAN erreichbar", "Eigene Domain oder Subdomain mit öffentlichem DNS-Eintrag", "Gültiges TLS-Zertifikat / HTTPS", "Portainer kann das öffentliche Repository harlekin2019/family-base abrufen"]),
    PageBreak()]

story += [P("3. Netzwerk und Adressen vorbereiten", "H1FB"),
    P("3.1 LAN-IP der Family-Base-VM", "H2FB"),
    P("Ermittle die feste LAN-IP der VM, auf der Docker und Portainer laufen. Beispiel: <b>192.168.178.50</b>. Diese Adresse wird in Portainer als <b>FAMILY_BASE_BIND_IP</b> und in Nginx Proxy Manager als Weiterleitungsziel verwendet."),
    P("Die IP sollte per statischer Konfiguration oder DHCP-Reservierung dauerhaft gleich bleiben. Die IP der Nginx-Proxy-Manager-VM ist nicht einzutragen.", "CalloutFB"),
    P("3.2 Verbindung zwischen den VMs", "H2FB"),
    bullets(["Beide VMs müssen über die Proxmox-Bridge beziehungsweise das lokale Netzwerk miteinander kommunizieren können.", "Die Nginx-Proxy-Manager-VM muss TCP-Port 3000 der Family-Base-VM erreichen.", "Ein gemeinsames Docker-Netzwerk ist nicht möglich und nicht erforderlich, da Docker-Netzwerke nicht über VM-Grenzen reichen.", "Die frühere Variable PROXY_NETWORK wird nicht mehr verwendet."]),
    P("3.3 DNS und Router", "H2FB"),
    bullets(["Subdomain festlegen, z. B. family.example.de.", "DNS A/AAAA-Eintrag auf die öffentliche Adresse des Anschlusses setzen.", "Am Router nur die für Nginx Proxy Manager benötigten Ports weiterleiten, normalerweise TCP 80 und 443.", "Port 3000 niemals über den Internet-Router weiterleiten."]),
    P("3.4 GitHub-Zugriff", "H2FB"),
    P("Das Repository <b>github.com/harlekin2019/family-base</b> ist öffentlich. Portainer benötigt daher keinen GitHub-Benutzernamen und kein Zugriffstoken."),
    PageBreak()]

story += [P("4. Stack in Portainer anlegen", "H1FB"),
    P("4.1 Repository-basierten Stack erstellen", "H2FB"),
    steps(["Portainer öffnen und den Docker-Endpunkt auswählen.", "Zu <b>Stacks</b> wechseln und <b>Add stack</b> wählen.", "Stack-Name <b>family-base</b> eintragen.", "Als Build-Methode <b>Repository</b> auswählen.", "Repository URL eintragen: <b>https://github.com/harlekin2019/family-base.git</b>.", "Repository reference auf <b>refs/heads/main</b> setzen.", "Compose path auf <b>compose.portainer.yml</b> setzen.", "Keine Repository-Authentifizierung aktivieren, da das Projekt öffentlich ist."]),
    P("4.2 Umgebungsvariablen", "H2FB"),
    table([
        ["Variable", "Beispiel", "Bedeutung"],
        ["TZ", "Europe/Berlin", "Zeitzone für Termine und Fälligkeiten"],
        ["FAMILY_BASE_BIND_IP", "192.168.178.50", "LAN-IP der Portainer-/Docker-VM"],
        ["FAMILY_BASE_PORT", "3000", "Port, den Nginx Proxy Manager im LAN erreicht"],
        ["RESEND_API_KEY", "leer / re_...", "Optionaler Schlüssel für E-Mail-Erinnerungen"],
    ], [42*mm, 43*mm, 69*mm]),
    P("RESEND_API_KEY kann zunächst leer bleiben. Der Stack ist bereits dafür vorbereitet. Geheimnisse niemals direkt in GitHub eintragen.", "CalloutFB"),
    P("4.3 Bereitstellen", "H2FB"),
    steps(["Einstellungen nochmals prüfen.", "<b>Deploy the stack</b> ausführen.", "Warten, bis Image-Build und Containerstart abgeschlossen sind.", "Unter <b>Containers</b> prüfen, dass <b>family-base</b> den Status running / healthy erreicht.", "Im LAN <b>http://IP-DER-FAMILY-BASE-VM:3000/api/health</b> öffnen. Die Antwort muss status: ok enthalten."]),
    P("Beim ersten Start werden die Datenbankmigrationen automatisch im Volume <b>family_base_data</b> angewendet."),
    PageBreak()]

story += [P("5. Nginx Proxy Manager und Anmeldung", "H1FB"),
    P("5.1 Proxy Host anlegen", "H2FB"),
    table([
        ["Feld", "Wert"],
        ["Schema", "http"],
        ["Forward Hostname / IP", "LAN-IP der Family-Base-VM, z. B. 192.168.178.50"],
        ["Zielport", "3000"],
        ["Websockets Support", "aktivieren"],
        ["Block Common Exploits", "aktivieren"],
        ["Domain Names", "deine Family-Base-Subdomain"],
    ], [55*mm, 99*mm]),
    P("Unter <b>SSL</b> ein Let's-Encrypt-Zertifikat anfordern. Force SSL, HTTP/2 Support und HSTS Enabled aktivieren."),
    P("5.2 Nginx-Proxy-Manager-Zugriffsliste", "H2FB"),
    steps(["Unter <b>Access Lists</b> eine Liste <b>Family Base</b> anlegen.", "Unter <b>Authorization</b> für jedes Familienmitglied einen Benutzer erstellen.", "Als Benutzernamen die vollständige E-Mail-Adresse des Mitglieds verwenden.", "Die Zugriffsliste dem Family-Base-Proxy-Host zuordnen."]),
    P("5.3 Custom Location für die Web-Anmeldung", "H2FB"),
    P("Im Proxy Host unter <b>Custom Locations</b> eine neue Location mit diesen Werten anlegen:"),
    table([
        ["Feld", "Wert"],
        ["Location", "/ (nur ein einzelner Schrägstrich)"],
        ["Schema", "http"],
        ["Forward Hostname / IP", "LAN-IP der Family-Base-VM, z. B. 192.168.178.50"],
        ["Forward Port", "3000"],
    ], [55*mm, 99*mm]),
    P("Über das Zahnrad der Custom Location das zusätzliche Konfigurationsfeld öffnen und dort ausschließlich diese drei Zeilen eintragen:"),
    P("""proxy_set_header X-Auth-Request-Email $remote_user;<br/>
proxy_set_header X-Auth-Request-User $remote_user;<br/>
proxy_set_header X-Forwarded-Email $remote_user;""", "CodeFB"),
    P("Keinen eigenen <b>location / { ... }</b>-Block um die drei Zeilen schreiben. Nginx Proxy Manager erzeugt diesen Block automatisch. Die Header gehören in die Custom Location und nicht in die allgemeine Advanced-Konfiguration.", "CalloutFB"),
    PageBreak(),
    P("5.4 Advanced-Konfiguration für die Android-App", "H2FB"),
    P("Im Reiter <b>Advanced</b> des Proxy Hosts bleibt nur die Ausnahme für die mobile Schnittstelle:"),
    P("""location ^~ /api/mobile {<br/>
&nbsp;&nbsp;auth_basic off;<br/>
&nbsp;&nbsp;proxy_set_header Authorization $http_authorization;<br/>
&nbsp;&nbsp;proxy_set_header Host $host;<br/>
&nbsp;&nbsp;proxy_set_header X-Real-IP $remote_addr;<br/>
&nbsp;&nbsp;proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;<br/>
&nbsp;&nbsp;proxy_set_header X-Forwarded-Proto $scheme;<br/>
&nbsp;&nbsp;proxy_pass http://192.168.178.50:3000;<br/>
}""", "CodeFB"),
    P("Die Beispiel-IP im proxy_pass muss durch die tatsächliche LAN-IP der Family-Base-VM ersetzt werden.", "CalloutFB"),
    P("Die Ausnahme für <b>/api/mobile</b> ermöglicht der Android-App die Anmeldung mit ihrem widerrufbaren Gerätezugang. Alle normalen Webseitenaufrufe bleiben durch die Zugriffsliste geschützt."),
    P("5.5 Erster Zugriff", "H2FB"),
    steps(["Öffentliche HTTPS-Adresse in einem privaten Browserfenster öffnen.", "Mit der vollständigen E-Mail-Adresse und dem Passwort der Nginx-Proxy-Manager-Zugriffsliste anmelden.", "Prüfen, ob der Hinweis <b>Nicht angemeldet</b> verschwunden ist.", "Administration öffnen und kontrollieren, ob das erste Familienmitglied automatisch als Administrator angelegt wurde.", "Weitere Mitglieder zuerst in Family Base mit ihrer exakten E-Mail-Adresse anlegen und erst danach ihren NPM-Zugang verwenden.", "Für die Android-App in der Administration pro Smartphone einen eigenen Gerätezugang erstellen und die öffentliche HTTPS-Adresse als Server eintragen."])]

story += [P("6. E-Mail-Erinnerungen", "H1FB"),
    P("Der Versand ist für Resend vorbereitet. Für den produktiven Versand werden ein Resend-Konto, eine bestätigte Absenderdomain und ein API-Schlüssel benötigt."),
    P("Einrichtung", "H2FB"),
    steps(["Absenderdomain in Resend verifizieren und die dort genannten DNS-Einträge setzen.", "Einen API-Schlüssel mit ausschließlich benötigten Versandberechtigungen erstellen.", "In Portainer den Stack öffnen und <b>RESEND_API_KEY</b> als Umgebungsvariable setzen.", "Stack neu bereitstellen.", "In Family Base unter Administration Absenderadresse, Aktivierung und Vorlaufzeit konfigurieren.", "Eine Testbenachrichtigung an eine kontrollierte Adresse versenden."]),
    P("Der Schlüssel gehört nur in die geschützte Portainer-Konfiguration. Er darf niemals in GitHub, README-Dateien oder Screenshots erscheinen.", "CalloutFB"),
    PageBreak(),
    P("7. Datenhaltung und Sicherung", "H1FB"),
    P("Alle persistenten Anwendungsdaten liegen im Docker-Volume <b>family_base_data</b>. Ein Neuaufbau des Containers löscht dieses Volume nicht."),
    P("Sicherungskonzept", "H2FB"),
    bullets(["Volume regelmäßig mit der vorhandenen Proxmox-/Docker-Backup-Lösung sichern.", "Mindestens eine Sicherung außerhalb des Docker-Hosts aufbewahren.", "Aufbewahrungsplan festlegen, z. B. täglich 7, wöchentlich 4, monatlich 6 Stände.", "Wiederherstellung regelmäßig in einer getrennten Testumgebung prüfen.", "Vor größeren Updates zusätzlich eine manuelle Sicherung erstellen."]),
    P("Für eine konsistente Sicherung sollte die Anwendung während der Volume-Sicherung kurz gestoppt oder eine Sicherungsmethode verwendet werden, die SQLite-Dateien konsistent erfasst."),
    PageBreak()]

story += [P("8. Updates und Wartung", "H1FB"),
    P("Aktualisierung über Portainer", "H2FB"),
    steps(["Vorher das Volume <b>family_base_data</b> sichern.", "In Portainer den Stack <b>family-base</b> öffnen.", "Repository erneut abrufen und <b>Pull and redeploy</b> ausführen.", "Build-Protokoll auf Fehler prüfen.", "Containerstatus und Healthcheck kontrollieren.", "Anmeldung, Kalender, Einkaufsliste und Administration kurz testen."]),
    P("Die Migrationen werden beim Start automatisch ausgeführt. Das Datenvolume bleibt bei einer normalen Neu-Bereitstellung bestehen."),
    P("Empfohlene Routine", "H2FB"),
    table([
        ["Intervall", "Prüfung"],
        ["Wöchentlich", "Backups und freier Speicher"],
        ["Monatlich", "Updates für Proxmox, Docker, Portainer und Reverse Proxy"],
        ["Vierteljährlich", "Wiederherstellungstest und Token-Prüfung"],
        ["Bei Änderungen", "Funktions- und Sicherheitstest nach Redeploy"],
    ], [42*mm, 112*mm]),
    P("9. Funktionsprüfung nach Installation", "H1FB"),
    bullets(["HTTPS ist aktiv; HTTP wird auf HTTPS umgeleitet.", "Direkter Zugriff auf Port 3000 von außen ist nicht möglich.", "Nicht angemeldete Benutzer werden zur Anmeldung geleitet oder abgewiesen.", "Angemeldete E-Mail wird korrekt erkannt.", "Familienmitglieder lassen sich administrieren.", "Einkaufslisten- und Rezeptzähler zeigen reale Werte.", "Kalender kann Tag, Woche und Monat anzeigen.", "Putzaufgaben können gespeichert, rotiert und erledigt werden.", "Container wird in Portainer als healthy angezeigt.", "Neustart des Containers erhält alle Daten."]),
    PageBreak()]

story += [P("10. Fehlerbehebung", "H1FB"),
    table([
        ["Symptom", "Wahrscheinliche Ursache", "Lösung"],
        ["Stack kann Repository nicht lesen", "Repository URL oder Branch falsch", "Öffentliche URL, refs/heads/main und Compose-Pfad prüfen"],
        ["Port 3000 nicht erreichbar", "Bind-IP oder Firewall falsch", "FAMILY_BASE_BIND_IP, VM-IP und lokale Firewall prüfen"],
        ["502 Bad Gateway", "NPM erreicht die andere VM nicht", "Forward-IP, Port 3000 und Proxmox-Bridge prüfen"],
        ["Nicht angemeldet", "Identitäts-Header stehen außerhalb der Location /", "Custom Location / anlegen und die drei X-Auth-/X-Forwarded-Header dort eintragen"],
        ["401 / Zugriff verweigert", "Zugriffsliste nicht zugeordnet oder Zugang falsch", "Access List am Proxy Host und E-Mail als Benutzername prüfen"],
        ["Android-App erhält 401", "Browser-Basic-Auth blockiert /api/mobile", "Advanced-location mit auth_basic off und Authorization-Header prüfen"],
        ["Container bleibt unhealthy", "Start/Migration fehlgeschlagen", "Container- und Stack-Protokolle prüfen; Volume-Schreibrechte kontrollieren"],
        ["Daten nach Neustart fehlen", "Volume nicht eingebunden", "Mount family_base_data:/data in Stack prüfen"],
        ["E-Mail kommt nicht an", "Schlüssel, Domain oder Absender falsch", "Resend-Protokoll, DNS-Verifizierung und Admin-Einstellungen prüfen"],
        ["Falsche Uhrzeit", "Zeitzone nicht gesetzt", "TZ=Europe/Berlin setzen und Stack neu bereitstellen"],
    ], [42*mm, 50*mm, 62*mm], compact=True),
    P("11. Wiederherstellung", "H1FB"),
    steps(["Beschädigten oder alten Stack stoppen.", "Sicherung des Volumes <b>family_base_data</b> zurückspielen.", "Sicherstellen, dass das Volume wieder exakt diesen Namen trägt.", "Stack aus dem öffentlichen GitHub-Repository neu bereitstellen.", "Startprotokoll und Migrationen prüfen.", "Anmeldung und kritische Daten stichprobenartig kontrollieren."]),
    P("12. Sicherheits-Checkliste", "H1FB"),
    bullets(["Repository ist öffentlich; deshalb befinden sich keine Zugangsdaten oder API-Schlüssel darin.", "RESEND_API_KEY liegt nur in Portainer.", "Port 3000 ist nur im LAN erreichbar und nicht am Internet-Router freigegeben.", "Nginx Proxy Manager erzwingt HTTPS.", "Webzugriff ist durch die NPM-Zugriffsliste oder einen vorgeschalteten Anmeldedienst geschützt.", "Die mobile Schnittstelle akzeptiert ausschließlich widerrufbare Family-Base-Gerätezugänge.", "Backups sind verschlüsselt und Wiederherstellungen wurden getestet.", "Administrationszugriff ist auf berechtigte Familienmitglieder begrenzt."]),
]

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
