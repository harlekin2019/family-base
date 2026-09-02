type Product = [string, string, string];

const groups = [
  ['Obst & Gemüse', ['Apfel','Birne','Banane','Orange','Mandarine','Zitrone','Limette','Trauben','Erdbeeren','Heidelbeeren','Himbeeren','Kirschen','Pfirsich','Nektarine','Pflaumen','Kiwi','Mango','Ananas','Avocado','Tomaten'], ['frisch','Bio','regional','Snackgröße','Familienpackung'], '500 g'],
  ['Gemüse & Salat', ['Gurke','Paprika','Karotten','Kartoffeln','Zwiebeln','Knoblauch','Brokkoli','Blumenkohl','Zucchini','Aubergine','Champignons','Spinat','Lauch','Sellerie','Radieschen','Feldsalat','Kopfsalat','Rucola','Kohlrabi','Süßkartoffeln'], ['frisch','Bio','regional','küchenfertig','Familienpackung'], '500 g'],
  ['Molkerei & Kühlung', ['Milch','Joghurt','Quark','Butter','Margarine','Sahne','Schmand','Crème fraîche','Frischkäse','Gouda','Emmentaler','Mozzarella','Feta','Parmesan','Eier','Pudding','Kefir','Buttermilch','Haferdrink','Sojadrink'], ['Natur','fettarm','laktosefrei','Bio','Großpackung'], '1 Packung'],
  ['Backwaren', ['Brot','Vollkornbrot','Toastbrot','Brötchen','Baguette','Ciabatta','Knäckebrot','Wraps','Croissants','Laugengebäck','Rosinenbrot','Pumpernickel','Fladenbrot','Burgerbrötchen','Hotdog-Brötchen'], ['klassisch','Vollkorn','Bio','glutenfrei','Familienpackung'], '1 Packung'],
  ['Vorrat', ['Nudeln','Spaghetti','Reis','Couscous','Bulgur','Haferflocken','Müsli','Cornflakes','Mehl','Zucker','Linsen','Kichererbsen','Kidneybohnen','Mais','Passierte Tomaten','Tomatenmark','Pesto','Kartoffelpüree','Gemüsebrühe','Kokosmilch'], ['klassisch','Bio','Vollkorn','fein','Großpackung'], '500 g'],
  ['Fleisch & Fisch', ['Hackfleisch','Rindersteak','Schweineschnitzel','Hähnchenbrust','Hähnchenschenkel','Putenbrust','Bratwurst','Wiener Würstchen','Salami','Kochschinken','Lachsfilet','Seelachsfilet','Garnelen','Thunfisch','Fischstäbchen'], ['frisch','Bio','mariniert','familienpackung','tiefgekühlt'], '500 g'],
  ['Tiefkühlkost', ['Pizza Margherita','Pizza Salami','Pommes frites','Kroketten','Gemüsemischung','Erbsen','Spinat','Beerenmischung','Eiscreme','Lasagne','Hähnchen-Nuggets','Frühlingsrollen','Kräuter','Brötchen','Kartoffeltaschen'], ['klassisch','Bio','XXL','vegetarisch','Familienpackung'], '1 Packung'],
  ['Getränke', ['Mineralwasser','Apfelsaft','Orangensaft','Multivitaminsaft','Cola','Limonade','Eistee','Kaffee','Espresso','Schwarztee','Grüntee','Kräutertee','Kakao','Malzgetränk','Tonic Water'], ['klassisch','zuckerfrei','Bio','Mehrweg','Familienpackung'], '1 l'],
  ['Süßes & Snacks', ['Schokolade','Gummibärchen','Kekse','Waffeln','Chips','Salzstangen','Nüsse','Popcorn','Müsliriegel','Fruchtgummi','Pralinen','Cracker','Reiswaffeln','Studentenfutter','Erdnüsse'], ['klassisch','Vollmilch','zuckerreduziert','Bio','Großpackung'], '1 Packung'],
  ['Haushalt', ['Toilettenpapier','Küchenrolle','Spülmittel','Spülmaschinentabs','Waschmittel','Weichspüler','Müllbeutel','Allzweckreiniger','Glasreiniger','Badreiniger','Schwämme','Backpapier','Alufolie','Frischhaltefolie','Gefrierbeutel'], ['klassisch','sensitiv','ökologisch','Nachfüllpack','Vorratspack'], '1 Packung'],
  ['Drogerie', ['Zahnpasta','Zahnbürsten','Duschgel','Shampoo','Spülung','Seife','Deodorant','Handcreme','Bodylotion','Taschentücher','Wattepads','Rasiergel','Rasierklingen','Sonnencreme','Pflaster'], ['klassisch','sensitiv','für Kinder','Naturkosmetik','Vorratspack'], '1 Packung'],
  ['Baby & Tierbedarf', ['Windeln','Feuchttücher','Babynahrung','Babybrei','Babyshampoo','Katzenfutter nass','Katzenfutter trocken','Katzenstreu','Hundefutter nass','Hundefutter trocken','Hundesnacks','Vogelfutter','Kleintierstreu','Tier-Spielzeug','Kotbeutel'], ['klassisch','sensitiv','Bio','Junior','Vorratspack'], '1 Packung'],
] as const;

export const extendedCatalog: Product[] = groups.flatMap(([category, bases, variants, quantity]) =>
  bases.flatMap((base) => variants.map((variant) => [`${base} – ${variant}`, category, quantity] as Product)),
).slice(0, 850);
