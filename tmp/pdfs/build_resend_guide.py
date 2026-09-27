from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, ListFlowable, ListItem

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "Family-Base-Resend-Einrichtung.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

FONTS = Path(r"C:\Windows\Fonts")
pdfmetrics.registerFont(TTFont("FB", str(FONTS / "arial.ttf")))
pdfmetrics.registerFont(TTFont("FB-Bold", str(FONTS / "arialbd.ttf")))

W, H = A4
BG = colors.HexColor("#101613")
PANEL = colors.HexColor("#1B241F")
PANEL2 = colors.HexColor("#243028")
INK = colors.HexColor("#F3F6F1")
MUTED = colors.HexColor("#A6B0A8")
GREEN = colors.HexColor("#B9F34A")
LINE = colors.HexColor("#354139")
AMBER = colors.HexColor("#F4C36B")
RED = colors.HexColor("#FF8585")

s = getSampleStyleSheet()
s.add(ParagraphStyle(name="T", fontName="FB-Bold", fontSize=27, leading=32, textColor=INK, spaceAfter=8))
s.add(ParagraphStyle(name="ST", fontName="FB", fontSize=12, leading=18, textColor=MUTED, spaceAfter=8))
s.add(ParagraphStyle(name="H1x", fontName="FB-Bold", fontSize=20, leading=24, textColor=INK, spaceBefore=3, spaceAfter=10))
s.add(ParagraphStyle(name="H2x", fontName="FB-Bold", fontSize=14, leading=18, textColor=GREEN, spaceBefore=9, spaceAfter=5, keepWithNext=True))
s.add(ParagraphStyle(name="H3x", fontName="FB-Bold", fontSize=10.5, leading=14, textColor=INK, spaceBefore=6, spaceAfter=3, keepWithNext=True))
s.add(ParagraphStyle(name="Bx", fontName="FB", fontSize=9.2, leading=13.7, textColor=INK, spaceAfter=6))
s.add(ParagraphStyle(name="Sx", fontName="FB", fontSize=7.8, leading=10.8, textColor=MUTED))
s.add(ParagraphStyle(name="CodeX", fontName="Courier", fontSize=7.7, leading=11, textColor=INK, backColor=PANEL2, borderColor=LINE, borderWidth=.5, borderPadding=7, spaceAfter=7))
s.add(ParagraphStyle(name="CallX", fontName="FB", fontSize=8.8, leading=13, textColor=INK, backColor=PANEL2, borderColor=colors.HexColor("#5A7C25"), borderWidth=.8, borderPadding=8, spaceBefore=4, spaceAfter=7))
s.add(ParagraphStyle(name="WarnX", fontName="FB", fontSize=8.8, leading=13, textColor=INK, backColor=colors.HexColor("#30291B"), borderColor=AMBER, borderWidth=.8, borderPadding=8, spaceBefore=4, spaceAfter=7))

def P(x, st="Bx"): return Paragraph(x, s[st])
def bullets(xs):
    return ListFlowable([ListItem(P(x), leftIndent=10) for x in xs], bulletType="bullet", bulletColor=GREEN, bulletFontName="FB-Bold", bulletFontSize=7, leftIndent=16, spaceAfter=5)
def steps(xs):
    return ListFlowable([ListItem(P(x), leftIndent=12) for x in xs], bulletType="1", start="1", bulletColor=GREEN, bulletFontName="FB-Bold", bulletFontSize=9, leftIndent=20, spaceAfter=6)
def grid(rows, widths):
    t = Table([[P(str(c), "Sx") for c in r] for r in rows], colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), PANEL), ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2D3A31")),
        ("GRID", (0,0), (-1,-1), .45, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    return t

def page(canvas, doc):
    canvas.saveState(); canvas.setFillColor(BG); canvas.rect(0,0,W,H,fill=1,stroke=0)
    canvas.setStrokeColor(colors.HexColor("#29332D")); canvas.line(18*mm,15*mm,W-18*mm,15*mm)
    canvas.setFont("FB",7.4); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm,9.5*mm,"Family Base - Resend-Einrichtung")
    canvas.drawRightString(W-18*mm,9.5*mm,f"Seite {doc.page}"); canvas.restoreState()

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=18*mm, bottomMargin=20*mm,
                        title="Family Base - Resend-Einrichtung", author="MicWic")
story=[]
logo=ROOT/"public"/"family-base-logo.png"
if logo.exists(): story += [Spacer(1,9*mm), Image(str(logo),52*mm,52*mm), Spacer(1,7*mm)]
story += [P("Resend für Family Base", "T"), P("Ausführliche Einrichtung von Domain, DNS, API-Schlüssel, Portainer und Testversand", "ST"),
          Spacer(1,7*mm), P("Ziel: Family Base versendet Erinnerungen zu fälligen und überfälligen Putzaufgaben an die hinterlegte E-Mail-Adresse des zugeordneten Familienmitglieds.", "H2x"),
          Spacer(1,28*mm), grid([["Komponente","Festlegung"],["Versanddienst","Resend"],["Geheimnis in Portainer","RESEND_API_KEY"],["Empfohlene Versanddomain","mail.deine-domain.de oder notify.deine-domain.de"],["Empfohlener Absender","Family Base <erinnerung@mail.deine-domain.de>"],["Stand","13. September 2026"]],[54*mm,100*mm]),
          Spacer(1,8*mm), P("Wichtig: Ersetze alle Beispieldomains durch deine echte Domain. DNS-Werte müssen exakt aus deinem Resend-Konto kopiert werden; sie sind für deine Domain individuell.", "WarnX"), PageBreak()]

story += [P("1. Was du vorab benötigst", "H1x"),
    bullets(["Eine eigene Domain, deren DNS-Einstellungen du ändern kannst.", "Zugang zu dem DNS-Anbieter, bei dem die autoritativen Nameserver deiner Domain verwaltet werden.", "Ein Resend-Konto.", "Administratorzugriff auf Portainer und Family Base.", "Eine gültige E-Mail-Adresse bei jedem Familienmitglied, das Erinnerungen erhalten soll."]),
    P("Empfehlung zur Domain", "H2x"),
    P("Verwende eine eigene Subdomain nur für Family-Base-Nachrichten, zum Beispiel <b>mail.example.de</b> oder <b>notify.example.de</b>. Resend empfiehlt Subdomains, um die Versand-Reputation vom übrigen E-Mail-Verkehr zu trennen."),
    P("Wenn du <b>mail.example.de</b> in Resend verifizierst, muss die Family-Base-Absenderadresse ebenfalls auf dieser Domain enden, zum Beispiel <b>erinnerung@mail.example.de</b>. Eine abweichende, nicht verifizierte Domain wird abgelehnt."),
    P("Datenschutz-Hinweis", "H2x"),
    P("Resend verarbeitet Empfängeradresse, Betreff, Nachrichteninhalt und Versandmetadaten. Die Auswahl einer europäischen Versandregion steuert den Versandweg, nicht den Speicherort aller Kontodaten: Laut Resend werden Konto-, Protokoll- und API-Metadaten weiterhin in den USA gespeichert. Prüfe dies für deinen persönlichen Einsatzzweck und dokumentiere den Dienst in deiner Datenschutzübersicht.", "CallX"),
    P("2. Resend-Konto und Domain anlegen", "H1x"),
    steps(["Öffne <b>https://resend.com</b>, erstelle ein Konto und bestätige deine Anmeldung.", "Öffne im Resend-Dashboard den Bereich <b>Domains</b>.", "Wähle <b>Add Domain</b>.", "Trage die gewählte Versanddomain ein, z. B. <b>mail.example.de</b>.", "Wähle als Versandregion vorzugsweise <b>Ireland (eu-west-1)</b>, wenn die Empfänger überwiegend in Deutschland/Europa sitzen.", "Bestätige das Anlegen. Resend zeigt nun die für diese Domain benötigten DNS-Einträge an."]),
    PageBreak()]

story += [P("3. DNS-Einträge richtig setzen", "H1x"),
    P("Übernimm ausschließlich die Werte, die Resend auf der Detailseite deiner Domain anzeigt. Typischerweise gehören DKIM sowie SPF/Return-Path dazu. Resend beschreibt für die Domainprüfung SPF und DKIM als erforderlich; DMARC ist zusätzlich empfehlenswert."),
    grid([["Eintrag","Zweck","Wichtig"],["DKIM (TXT)","Kryptografische Signatur der Nachricht","Name und langen Schlüssel vollständig kopieren"],["SPF (TXT)","Erlaubt Resend den Versand","Nicht mit einem bestehenden SPF am selben Host vermischen"],["Return-Path / MX","Rückläufer und Beschwerden","Ziel und Priorität exakt aus Resend übernehmen"],["DMARC (TXT, optional)","Regeln gegen Absenderfälschung","Nach erfolgreichem SPF/DKIM schrittweise einführen"]],[36*mm,52*mm,66*mm]),
    P("Vorgehen beim DNS-Anbieter", "H2x"),
    steps(["Öffne die DNS-Zone deiner Hauptdomain.", "Lege jeden von Resend angezeigten Datensatz einzeln an.", "Bei einem Feld <b>Name/Host</b> verlangen viele Anbieter nur den relativen Teil. Beispiel: Statt send.example.de kann dort nur <b>send</b> erforderlich sein.", "TTL kann meist auf Auto oder dem Standardwert bleiben.", "Bei MX die von Resend angezeigte Priorität übernehmen.", "Speichern und zum Resend-Dashboard zurückkehren."]),
    P("Cloudflare", "H2x"),
    P("Bei Cloudflare müssen Mail-DNS-Einträge auf <b>DNS only</b> stehen; sie dürfen nicht orange proxied sein. Resend bietet dort nach aktueller Dokumentation auch eine automatische Domain-Connect-Einrichtung an. Prüfe nach einer automatischen Einrichtung trotzdem alle erzeugten Einträge."),
    P("Niemals Beispielwerte blind übernehmen", "H2x"),
    P("DKIM-Schlüssel, AWS-Region und MX-Ziel können sich unterscheiden. Kopiere deshalb keine Werte aus dieser Anleitung oder aus fremden Screenshots, sondern immer direkt aus deiner Resend-Domainansicht.", "WarnX"), PageBreak()]

story += [P("4. Domain in Resend verifizieren", "H1x"),
    steps(["Öffne die angelegte Domain in Resend.", "Wähle <b>Verify DNS Records</b> bzw. <b>Restart verification</b>.", "Warte, bis SPF und DKIM als verifiziert angezeigt werden.", "Prüfe, dass der Gesamtstatus der Domain <b>Verified</b> lautet."]),
    P("Die Prüfung klappt häufig innerhalb weniger Minuten. DNS-Verteilung kann laut Resend jedoch bis zu 72 Stunden dauern."),
    P("Wenn die Prüfung fehlschlägt", "H2x"),
    bullets(["Kontrolliere, ob du die Einträge beim tatsächlich zuständigen Nameserver-Anbieter gesetzt hast.", "Prüfe, ob dein Anbieter die Hauptdomain automatisch an den Hostnamen anhängt.", "Achte bei langen DKIM-Werten auf abgeschnittene Zeichen, zusätzliche Anführungszeichen oder Leerzeichen.", "Prüfe, ob MX-Ziel und ausgewählte Region zusammenpassen.", "Bei automatisch ergänzten MX-Zielen kann ein abschließender Punkt nötig sein, z. B. smtp-ziel.example.<b>.</b>", "Entferne alte, widersprüchliche Resend-MX-Einträge anderer Regionen."]),
    P("Optionale Prüfung unter Windows", "H3x"),
    P("nslookup -type=TXT resend._domainkey.mail.example.de\nnslookup -type=TXT send.mail.example.de\nnslookup -type=MX send.mail.example.de", "CodeX"),
    P("Die tatsächlichen Hostnamen können abweichen. Verwende genau die Namen, die Resend für deine Domain anzeigt."),
    P("5. Sicheren API-Schlüssel erstellen", "H1x"),
    steps(["Im Resend-Dashboard <b>API Keys</b> öffnen.", "<b>Create API Key</b> wählen.", "Als Namen z. B. <b>Family Base Produktion</b> eintragen.", "Berechtigung <b>Sending access</b> wählen - Full access ist für Family Base nicht erforderlich.", "Wenn angeboten, den Schlüssel auf deine verifizierte Versanddomain beschränken.", "Schlüssel erstellen und den angezeigten Wert sofort sicher kopieren."]),
    P("Resend zeigt den Schlüsselwert nur einmal. Er beginnt üblicherweise mit <b>re_</b>. Speichere ihn nicht im GitHub-Repository, nicht in der Compose-Datei und nicht im Browser-Code.", "WarnX"), PageBreak()]

story += [P("6. API-Schlüssel in Portainer eintragen", "H1x"),
    P("Family Base erwartet den Schlüssel serverseitig in der Umgebungsvariable <b>RESEND_API_KEY</b>. Die Datei compose.portainer.yml ist bereits dafür vorbereitet."),
    steps(["Portainer öffnen und zu <b>Stacks</b> wechseln.", "Den Stack <b>family-base</b> öffnen.", "<b>Editor</b>, <b>Update the stack</b> oder den Bereich für Environment variables öffnen - die Bezeichnung hängt von der Portainer-Version ab.", "Die Variable <b>RESEND_API_KEY</b> suchen oder neu hinzufügen.", "Als Wert den vollständig kopierten Resend-Schlüssel <b>re_...</b> einsetzen.", "Falls Portainer eine Secret-Funktion für deinen Stack-Typ anbietet, diese bevorzugen; andernfalls die geschützte Stack-Umgebungsvariable verwenden.", "<b>Pull latest image</b> ist bei einer reinen Schlüsseländerung nicht erforderlich; den Stack jedoch neu bereitstellen, damit der Container die Variable erhält.", "Warten, bis der Container <b>family-base</b> wieder running / healthy ist."]),
    P("Prüfung ohne Schlüsselanzeige", "H2x"),
    P("Öffne Family Base und gehe in die Administration. Im Bereich E-Mail-Erinnerungen muss statt <b>API-Schlüssel fehlt</b> der Status <b>Versanddienst verbunden</b> erscheinen. Der Schlüssel selbst wird bewusst nicht in der App angezeigt."),
    P("Sicherheitsregeln", "H2x"),
    bullets(["Schlüssel niemals per E-Mail oder Chat weitergeben.", "Keine Screenshots erstellen, auf denen der Schlüssel sichtbar ist.", "Bei Verdacht auf Offenlegung sofort einen neuen Schlüssel erstellen, in Portainer austauschen, testen und erst danach den alten löschen.", "Resend-Schlüssel laufen nicht automatisch ab; regelmäßige Rotation selbst einplanen."]),
    PageBreak()]

story += [P("7. Family Base konfigurieren", "H1x"),
    P("Öffne <b>Administration -> E-Mail-Erinnerungen</b>. Nur Administratoren dürfen diese Einstellungen verändern oder Testmails senden."),
    grid([["Feld","Empfehlung","Beispiel"],["Versanddienst","Resend (fest eingestellt)","Resend"],["Absendername","Für Empfänger klar erkennbar","Family Base"],["Absenderadresse","Adresse auf der verifizierten Domain","erinnerung@mail.example.de"],["Antwortadresse","Echte Adresse für Rückfragen, optional","familie@example.de"],["Erinnerung vor Fälligkeit","Passend zum Familienalltag","1 Tag vorher"],["Überfällige Aufgaben","Nach Wunsch aktivieren","aktiv"],["E-Mail-Erinnerungen","Erst nach erfolgreichem Test aktivieren","zunächst aus"]],[38*mm,64*mm,52*mm]),
    steps(["Alle Felder ausfüllen.", "Einstellungen speichern.", "Prüfen, ob beim aktuell angemeldeten Admin-Mitglied eine gültige E-Mail-Adresse hinterlegt ist.", "Die Schaltfläche für die Test-E-Mail ausführen.", "Posteingang und Spam-Ordner kontrollieren.", "Erst nach erfolgreichem Test <b>E-Mail-Erinnerungen nach Verbindung aktivieren</b> einschalten und erneut speichern."]),
    P("Absenderadresse", "H2x"),
    P("Resend verlangt keine separate Anlage jeder einzelnen Absenderadresse. Sobald deine Domain verifiziert ist, kannst du eine beliebige Adresse dieser Domain als From-Adresse verwenden. Für Antworten sollte die optionale Antwortadresse tatsächlich erreichbar sein."),
    P("Empfängeradressen", "H2x"),
    P("Öffne in der Administration jedes Familienmitglied und hinterlege dessen korrekte E-Mail-Adresse. Eine Erinnerung wird nur für eine zugeordnete, noch nicht erledigte Putzaufgabe versendet, wenn das zugeordnete Mitglied eine E-Mail-Adresse besitzt."), PageBreak()]

story += [P("8. So arbeitet der Versand in Family Base", "H1x"),
    bullets(["Family Base sendet aktuell Erinnerungen für Putzaufgaben, nicht für Kalendertermine oder allgemeine To-dos.", "Die Nachricht enthält Aufgabe, Fälligkeit und erreichbare Punkte.", "Vorab-Erinnerungen richten sich nach der in der Administration ausgewählten Vorlaufzeit.", "Überfällige Erinnerungen werden nur gesendet, wenn diese Option aktiviert ist.", "Doppelte Zustellungen derselben Erinnerungsart und Fälligkeit werden in der Datenbank verhindert.", "Der Versand wird beim Abruf der Family-Base-Daten geprüft. Es ist derzeit kein unabhängiger Hintergrund-Zeitplaner im Container eingerichtet."]),
    P("Wichtige praktische Folge", "H2x"),
    P("Wenn niemand Family Base öffnet und kein regelmäßiger Abruf stattfindet, wird die Prüfung nicht exakt zu einem festen Zeitpunkt angestoßen. Für wirklich zeitgenaue Erinnerungen sollte später ein geschützter Scheduler/Job ergänzt werden, der die Erinnerungsroutine regelmäßig serverseitig ausführt.", "WarnX"),
    P("9. Testplan", "H1x"),
    steps(["Test-Putzaufgabe erstellen und dem Admin-Mitglied zuordnen.", "Fälligkeit passend zur gewählten Vorlaufzeit setzen.", "Sicherstellen, dass die E-Mail-Adresse des Mitglieds stimmt.", "In der Administration Testmail senden und Eingang prüfen.", "E-Mail-Erinnerungen aktivieren.", "Family Base neu laden, damit die Erinnerungsprüfung ausgeführt wird.", "Unter Resend <b>Emails</b> bzw. <b>Logs</b> den Status der Nachricht prüfen.", "Erhaltene Nachricht auf korrekten Absender, Betreff, Fälligkeit und Punkte kontrollieren."]),
    P("10. Typische Fehler", "H1x"),
    grid([["Anzeige / Fehler","Ursache","Lösung"],["API-Schlüssel fehlt","Variable fehlt im laufenden Container","RESEND_API_KEY in Portainer setzen und Stack neu bereitstellen"],["Test-Schaltfläche deaktiviert","Schlüssel oder Absender fehlt","Status prüfen, Absender speichern"],["Versand abgelehnt","Schlüssel ungültig oder Domain nicht verifiziert","Sending-Key, Domainstatus und From-Adresse prüfen"],["Nur eigene Adresse möglich","Resend-Testdomain statt eigener Domain","Eigene Domain verifizieren und Absender umstellen"],["Mail im Spam","Reputation/Authentifizierung","SPF, DKIM, DMARC und verständlichen Inhalt prüfen"],["Keine Erinnerung","Mitglied ohne Mail, Aufgabe erledigt/außerhalb Zeitfenster oder kein Abruf","Zuordnung, Fälligkeit, Einstellungen und App-Abruf prüfen"]],[42*mm,50*mm,62*mm]),
    PageBreak()]

story += [P("11. Abschluss-Checkliste", "H1x"),
    bullets(["Eigene Versand-Subdomain in Resend steht auf Verified.", "SPF und DKIM sind erfolgreich; DMARC ist geprüft bzw. geplant.", "API-Schlüssel besitzt nur Sending access und ist auf die Versanddomain beschränkt.", "RESEND_API_KEY ist ausschließlich in Portainer gespeichert.", "Container wurde nach der Änderung neu bereitgestellt und ist healthy.", "Family Base zeigt Versanddienst verbunden.", "Absenderadresse gehört zur verifizierten Domain.", "Jedes relevante Familienmitglied besitzt eine korrekte E-Mail-Adresse.", "Testmail wurde zugestellt und Resend zeigt einen erfolgreichen Versand.", "Erinnerungen wurden erst danach aktiviert.", "Schlüsselrotation und Volume-Backup sind dokumentiert."]),
    P("12. Offizielle Quellen", "H1x"),
    P("Die Anleitung wurde anhand der eingebauten Family-Base-Konfiguration und der folgenden offiziellen Resend-Dokumentation erstellt (Abruf: 13. September 2026):"),
    bullets(["Domains: https://resend.com/docs/dashboard/domains/introduction", "Regionen: https://resend.com/docs/dashboard/domains/regions", "API-Schlüssel: https://resend.com/docs/dashboard/api-keys/introduction", "API-Schlüssel sicher behandeln: https://resend.com/docs/knowledge-base/how-to-handle-api-keys", "Absenderadressen: https://resend.com/docs/knowledge-base/how-do-I-create-an-email-address-or-sender-in-resend", "Domainprüfung reparieren: https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying", "Cloudflare DNS: https://resend.com/docs/knowledge-base/cloudflare", "DMARC: https://resend.com/docs/dashboard/domains/dmarc", "E-Mail senden: https://resend.com/docs/api-reference/emails/send-email"]),
    P("Die Bildschirmbezeichnungen bei Resend und Portainer können sich durch Produktaktualisierungen geringfügig ändern. Entscheidend sind die hier beschriebenen Funktionen und Werte.", "CallX")]

doc.build(story, onFirstPage=page, onLaterPages=page)
print(OUT)
