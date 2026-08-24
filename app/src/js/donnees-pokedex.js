// Les Pokédex de jeux, tels que Pokékalos les recense — RELEVÉ.
//
// GÉNÉRÉ par outils/relever-pokedex.py — ne pas éditer à la main.
//
//   · Pokédex d'Illumis                 297 noms  → dex « lumiose-city »
//     https://www.pokekalos.fr/jeux/switch/lpza/articles-pokedex-du-jeu-5702.html
//   · Pokédex d'Extra Illumis           165 noms  → dex « hyperspace »
//     https://www.pokekalos.fr/jeux/switch/mega-dimension/articles-pokedex-d-extra-illumis-6277.html
//   · Pokédex de Paldea                 429 noms  → dex « paldea »
//     https://www.pokekalos.fr/jeux/switch/pev/articles-pokedex-regional-4167.html
//   · Pokédex de Septentria             200 noms  → dex « kitakami »
//     https://www.pokekalos.fr/jeux/switch/pev/dlc/articles-pokedex-regional-de-septentria-5221.html
//   · Pokédex du Disque Indigo          226 noms  → dex « blueberry »
//     https://www.pokekalos.fr/jeux/switch/pev/dlc/articles-pokedex-regional-du-disque-indigo-5222.html
//   · Pokédex de Sinnoh                 150 noms  → dex « original-sinnoh »
//     https://www.pokekalos.fr/jeux/switch/dp/articles-pokedex-regional-de-sinnoh-2749.html
//   · Pokédex de Galar                  406 noms  → dex « galar »
//     https://www.pokekalos.fr/jeux/switch/pokemonepeepokemonbouclier/articles-pokedex-regional-de-galar-1138.html
//   · Pokédex d'Isolarmure              211 noms  → dex « isle-of-armor »
//     https://www.pokekalos.fr/jeux/switch/pokemonepeepokemonbouclier/articles-pokedex-regional-d-isolarmure-1969.html
//   · Pokédex de Couronneige            210 noms  → dex « crown-tundra »
//     https://www.pokekalos.fr/jeux/switch/pokemonepeepokemonbouclier/articles-pokedex-regional-de-couronneige-2455.html
//   · Pokédex de Kanto (Let's Go)       171 noms  → dex « letsgo-kanto »
//     https://www.pokekalos.fr/jeux/switch/pokemonletsgopikachuevoli/articles-le-pokedex-regional-et-localisation-678.html
//   · Pokédex National jusqu'à Arceus   493 noms  → dex « national-gen4 »
//     https://www.pokekalos.fr/jeux/switch/dp/articles-completer-le-pokedex-national-3713.html
//
// Ce fichier ne construit AUCUN Pokédex : l'application lit les siens dans
// DONNEES_EMBARQUEES.dex, générée depuis PokeAPI. Celui-ci est la contre-
// épreuve du banc, comme donnees-home.js l'est pour le périmètre HOME — une
// régénération qui perdrait des entrées se verrait au passage suivant.
//
// Des NOMS et non des numéros : les pages ne numérotent pas de la même façon.
// La plupart donnent le numéro propre au Pokédex (#001 Germignon pour Illumis),
// le Disque Indigo donne le numéro national (#0084 Doduo). Le nom français est
// la seule identité qu'elles partagent — c'est déjà le choix de donnees-home.js.
// Les barres verticales séparent, un nom contenant des espaces (« M. Mime »,
// « Ramoloss de Galar »).
//
// Les listes portent les Méga et les formes régionales, qui partagent le numéro
// de leur forme de base : 297 noms pour les 232 entrées d'Illumis, 406 pour les
// 400 de Galar. Ramenées à l'espèce par le banc, elles retombent sur le compte.

const RELEVE_POKEDEX = {
  // Pokédex d'Illumis — 297 noms
  'lumiose-city': (
    'Germignon|Macronium|Méganium|Méga-Méganium|Gruikui|Grotichon|' +
    'Roitiflam|Méga-Roitiflam|Kaiminus|Crocrodil|Aligatueur|' +
    'Méga-Aligatueur|Passerouge|Braisillon|Flambusard|Sapereau|' +
    'Excavarenne|Lépidonille|Pérégrain|Prismillon|Aspicot|Coconfort|' +
    'Dardargnan|Méga-Dardargnan|Roucool|Roucoups|Roucarnage|' +
    'Méga-Roucarnage|Wattouat|Lainergie|Pharamp|Méga-Pharamp|Ratentif|' +
    'Miradar|Rozbouton|Rosélia|Roserade|Magicarpe|Léviator|Méga-Léviator|' +
    'Opermine|Golgopathe|Méga-Golgopathe|Stari|Staross|Méga-Staross|' +
    'Flabébé|Floette|Méga-Floette|Florges|Cabriolaine|Chevroum|Psystigri|' +
    'Mistigrix|Hélionceau|Némélios|Méga-Némélios|Pandespiègle|Pandarbare|' +
    'Miamiasme|Miasmax|Dedenne|Pichu|Pikachu|Raichu|Mélo|Mélofée|' +
    'Mélodelfe|Méga-Mélodelfe|Mimigal|Migalos|Abo|Arbok|Abra|Kadabra|' +
    'Alakazam|Méga-Alakazam|Fantominus|Spectrum|Ectoplasma|' +
    'Méga-Ectoplasma|Venipatte|Scobolide|Brutapode|Méga-Brutapode|' +
    'Monorpale|Dimoclès|Exagide|Chétiflor|Boustiflor|Empiflor|' +
    'Méga-Empiflor|Feuillajou|Feuiloutan|Flamajou|Flamoutan|Flotajou|' +
    'Flotoutan|Méditikka|Charmina|Méga-Charmina|Dynavolt|Élecsprint|' +
    'Méga-Élecsprint|Tarsal|Kirlia|Gardevoir|Méga-Gardevoir|Gallame|' +
    'Méga-Gallame|Malosse|Démolosse|Méga-Démolosse|Tylton|Altaria|' +
    'Méga-Altaria|Nanméouïe|Méga-Nanméouïe|Fluvetin|Cocotine|Sucroquin|' +
    'Cupcanaille|Évoli|Aquali|Voltali|Pyroli|Mentali|Noctali|Phyllali|' +
    'Givrali|Nymphali|Laporeille|Lockpin|Méga-Lockpin|Polichombr|Branette|' +
    'Méga-Branette|Sorbébé|Sorboul|Sorbouboul|Chamallot|Camérupt|' +
    'Méga-Camérupt|Hippopotas|Hippodocus|Rototaupe|Minotaupe|' +
    'Méga-Minotaupe|Mascaïman|Escroco|Crocorible|Machoc|Machopeur|' +
    'Mackogneur|Griknot|Carmache|Carchacrok|Méga-Carchacrok|Strassie|' +
    'Ténéfix|Méga-Ténéfix|Mysdibule|Méga-Mysdibule|Absol|Méga-Absol|Riolu|' +
    'Lucario|Méga-Lucario|Ramoloss|Flagadoss|Méga-Flagadoss|Roigada|' +
    'Carvanha|Sharpedo|Méga-Sharpedo|Anchwatt|Lampéroie|Ohmassacre|' +
    'Méga-Ohmassacre|Minidraco|Draco|Dracolosse|Méga-Dracolosse|' +
    'Bulbizarre|Herbizarre|Florizarre|Méga-Florizarre|Salamèche|Reptincel|' +
    'Dracaufeu|Méga-Dracaufeu X|Méga-Dracaufeu Y|Carapuce|Carabaffe|' +
    'Tortank|Méga-Tortank|Limonde|Couafarel (Forme Sauvage)|Sepiatop|' +
    'Sepiatroce|Méga-Sepiatroce|Venalgue|Kravarech|Méga-Kravarech|' +
    'Flingouste|Gamblast|Mucuscule|Colimucus|Muplodocus|Cadoizo|Stalgamin|' +
    'Oniglali|Méga-Oniglali|Momartik|Méga-Momartik|Blizzi|Blizzaroi|' +
    'Méga-Blizzaroi|Grelaçon|Séracrawl|Insécateur|Cizayox|Méga-Cizayox|' +
    'Scarabrute|Méga-Scarabrute|Scarhino|Méga-Scarhino|Emolga|Brutalibré|' +
    'Méga-Brutalibré|Brocélôme|Desséliande|Baggiguane|Baggaïd|' +
    'Méga-Baggaïd|Sonistrelle|Bruyverne|Trousselin|Funécire|Mélancolux|' +
    'Lugulabre|Méga-Lugulabre|Ptéra|Méga-Ptéra|Ptyranidur|Rexillius|' +
    'Amagara|Dragmara|Onix|Steelix|Méga-Steelix|Galekid|Galegon|Galeking|' +
    'Méga-Galeking|Galvaran|Iguolta|Pitrouille|Banshitrouye|Embrylex|' +
    'Ymphect|Tyranocif|Méga-Tyranocif|Grenousse|Croâporal|Amphinobi|' +
    'Méga-Amphinobi|Hexadron|Méga-Hexadron|Marisson|Boguérisse|' +
    'Blindépique|Méga-Blindépique|Airmure|Méga-Airmure|Feunnec|Roussil|' +
    'Goupelin|Méga-Goupelin|Draby|Drackhaus|Drattak|Méga-Drattak|' +
    'Kangourex|Méga-Kangourex|Draïeul|Méga-Draïeul|Terhal|Métang|' +
    'Métalosse|Méga-Métalosse|Xerneas|Yveltal|Zygarde|Méga-Zygarde|' +
    'Diancie|Mewtwo'
  ).split('|'),

  // Pokédex d'Extra Illumis — 165 noms
  'hyperspace': (
    'Férosinge|Colossinge|Courrousinge|Miaouss|Miaouss (Forme d\'Alola)|' +
    'Miaouss (Forme de Galar)|Persian|Persian (Forme d\'Alola)|Berserkatt|' +
    'Canarticho|Canarticho (Forme de Galar)|Palarticho|Osselait|' +
    'Ossatueur (Forme d\'Alola)|Ossatueur|Porygon|Porygon2|Porygon-Z|' +
    'Pimito|Scovilain|Méga-Scovilain|Forgerette|Forgella|Forgelina|' +
    'Motorizard|Germéclat|Floréclat|Méga-Floréclat|Motisma|Toutombe|' +
    'Tomberro|Bacabouh|Trépassable|Kecleon|Flamenroule|Hexagel|Oyacata|' +
    'Nigirigon (Forme Courbée)|Nigirigon (Forme Affalée)|' +
    'Nigirigon (Forme Raide)|Méga-Nigirigon|Frigodo|Cryodo|Glaivodo|' +
    'Méga-Glaivodo|Mordudor|Gromago|Qwilfish|Qwilpik|Arcko|Massko|Jungko|' +
    'Méga-Jungko|Poussifeu|Galifeu|Braségali|Méga-Braségali|Gobou|Flobio|' +
    'Laggron|Méga-Laggron|Barpau|Milobellus|Korillon|Éoko|Méga-Éoko|' +
    'Wimessir (Mâle)|Wimessir (Femelle)|Chacripan|Léopardus|Munna|Mushana|' +
    'Judokrak|Karaclée|Tutafeh|Tutafeh (Forme de Galar)|Tutankafer|' +
    'Tutétékri|Sovkipou|Sarmuraï|Méga-Sarmuraï|Goupilou|Roublenard|' +
    'Poulpaf|Krakos|Mimiqui|Hachécateur|Morpeko|Gringolem|Golemastoc|' +
    'Méga-Golemastoc|Minisange|Bleuseille|Corvaillus|Toudoudou|Rondoudou|' +
    'Grodoudou|Pâtachiot|Briochien|Étourmi|Étourvol|Étouraptor|' +
    'Méga-Étouraptor|Spoink|Groret|Tapatoès|Crabagarre|Crabominable|' +
    'Méga-Crabominable|Selutin|Amassel|Gigansel|Gloupti|Avaltout|' +
    'Nosferapti|Nosferalto|Nostenfer|Charbambin|Carmadura|Malvalame|' +
    'Grondogue|Dogrino|Toxizap|Salarsen (Forme Aigüe)|' +
    'Salarsen (Forme Grave)|Gribouraigne|Tag-Tag|Mangriff|Séviper|' +
    'Mime Jr.|M. Mime|M. Mime (Forme de Galar)|M. Glaquette|Trompignon|' +
    'Gaulet|Heatran|Méga-Heatran|Volcanion|Cobaltium|Terrakium|Viridium|' +
    'Keldeo (Aspect Normal)|Meloetta (Forme Chant)|Genesect|' +
    'Hoopa (Hoopa Enchaîné)|Marshadow|Meltan|Melmetal|Darkrai|' +
    'Méga-Darkrai|Latias|Méga-Latias|Latios|Méga-Latios|Kyogre|' +
    'Kyogre (Primo-Kyogre)|Groudon|Groudon (Primo-Groudon)|Rayquaza|' +
    'Méga-Rayquaza|Magearna|Magearna (Couleur du passé)|Méga-Magearna|' +
    'Zeraora|Méga-Zeraora'
  ).split('|'),

  // Pokédex de Paldea — 429 noms
  'paldea': (
    'Poussacha|Matourgeon|Miascarade|Chochodile|Crocogril|Flamigator|' +
    'Coiffeton|Canarbello|Palmaval|Gourmelet|Fragroin|Tissenboule|' +
    'Filentrappe|Lilliterelle|Gambex|Granivol|Floravol|Cotovol|Passerouge|' +
    'Braisillon|Flambusard|Pohm|Pohmotte|Pohmarmotte|Malosse|Démolosse|' +
    'Manglouton|Argouste|Rongourmand|Rongrigou|Tournegrin|Héliatronc|' +
    'Crikzik|Mélokrik|Lépidonille|Pérégrain|Prismillon|Apitrini|Apireine|' +
    'Minisange|Bleuseille|Corvaillus|Ptiravi|Leveinard|Leuphorie|Azurill|' +
    'Marill|Azumarill|Arakdo|Maskadra|Mustébouée|Mustéflott|Axoloto|' +
    'Axoloto de Paldea|Terraiste|Psykokwak|Akwakwak|Khélocrok|Torgamord|' +
    'Toudoudou|Rondoudou|Grodoudou|Tarsal|Kirlia|Gardevoir|Gallame|' +
    'Soporifik|Hypnomade|Fantominus|Spectrum|Ectoplasma|Compagnol|' +
    'Famignol|Pichu|Pikachu|Raichu|Raichu d\'Alola|Pâtachiot|Briochien|' +
    'Parecool|Vigoroth|Monaflèmit|Croquine|Candine|Sucreine|Olivini|' +
    'Olivado|Arboliva|Manzaï|Simularbre|Rocabot|Lougaroc|' +
    'Lougaroc forme Nocturne|Lougaroc forme Crépusculaire|Charbi|Wagomine|' +
    'Monthracite|Lixy|Luxio|Luxray|Étourmi|Étourvol|Étouraptor|Plumeline|' +
    'Wattouat|Lainergie|Pharamp|Chlorobule|Fragilady|Fragilady de Hisui|' +
    'Balignon|Chapignon|Verpom|Pomdrapi|Dratatin|Spoink|Groret|Tapatoès|' +
    'Feuforêve|Magirêve|Makuhita|Hariyama|Crabagarre|Crabominable|Tritox|' +
    'Malamandre|Phanpy|Donphan|Charibari|Pachyradjah|Griknot|Carmache|' +
    'Carchacrok|Selutin|Amassel|Gigansel|Goélise|Bekipan|Magicarpe|' +
    'Léviator|Embrochet|Hastacuda|Bargantua Motif Rouge|' +
    'Bargantua Motif Bleu|Bargantua Motif Blanc|Gloupti|Avaltout|Miaouss|' +
    'Miaouss d\'Alola|Miaouss de Galar|Persian|Persian d\'Alola|Baudrive|' +
    'Grodrive|Flabébé|Floette|Florges|Taupiqueur|Taupiqueur d\'Alola|' +
    'Triopikeur|Triopikeur d\'Alola|Chartor|Chamallot|Camérupt|Archéomire|' +
    'Archéodong|Coupenotte|Incisache|Tranchodon|Férosinge|Colossinge|' +
    'Courrousinge|Méditikka|Charmina|Riolu|Lucario|Charbambin|Carmadura|' +
    'Malvalame|Barloche|Barbicha|Têtampoule|Ampibidou|Mucuscule|Colimucus|' +
    'Colimucus de Hisui|Muplodocus|Muplodocus de Hisui|Cradopaud|Coatox|' +
    'Zapétrel|Fulgulairo|Évoli|Aquali|Voltali|Pyroli|Mentali|Noctali|' +
    'Phyllali|Givrali|Nymphali|Insolourdo|Deusolourdo|Vivaldaim|Haydaim|' +
    'Girafarig|Farigiraf|Tadmorv|Tadmorv d\'Alola|Grotadmorv|' +
    'Grotadmorv d\'Alola|Grondogue|Dogrino|Toxizap|Salarsen|Dedenne|' +
    'Pachirisu|Gribouraigne|Tag-Tag|Cerfrousse|Trompignon|Gaulet|Voltorbe|' +
    'Voltorbe de Hisui|Électrode|Électrode de Hisui|Magnéti|Magnéton|' +
    'Magnézone|Métamorph|Caninos|Caninos de Hisui|Arcanin|' +
    'Arcanin de Hisui|Teddiursa|Ursaring|Mangriff|Séviper|Tylton|Altaria|' +
    'Cabriolaine|Chevroum|Tauros|Tauros de Paldea|Hélionceau|Némélios|' +
    'Moufouette|Moufflair|Zorua|Zorua de Hisui|Zoroark|Zoroark de Hisui|' +
    'Farfuret|Farfuret de Hisui|Dimoret|Cornèbre|Corboss|Scrutella|' +
    'Mesmérella|Sidérella|Théffroi|Polthégeist|Mimiqui|Trousselin|' +
    'Wimessir|Virovent|Virevorreur|Terracool|Terracruel|Tropius|Mimantis|' +
    'Floramantis|Craparoi|Pimito|Scovilain|Cacnea|Cacturne|Léboulérou|' +
    'Bérasca|Mimitoss|Aéromite|Pomdepik|Foretress|Insécateur|Cizayox|' +
    'Scarhino|Flotillon|Cléopsytra|Hippopotas|Hippodocus|Mascaïman|' +
    'Escroco|Crocorible|Dunaja|Dunaconda|Tiboudet|Bourrinos|Pyronille|' +
    'Pyrax|Draby|Drackhaus|Drattak|Forgerette|Forgella|Forgelina|Bibichut|' +
    'Chapotus|Sorcilence|Grimalin|Fourbelin|Angoliath|Taupikeau|' +
    'Triopikeau|Lestombaile|Dofin|Superdofin|Vrombi|Vrombotor|Motorizard|' +
    'Ferdeter|Ténéfix|Polichombr|Branette|Hexadron|Brutalibré|Spiritomb|' +
    'Sonistrelle|Bruyverne|Fantyrm|Dispareptil|Lanssorien|Germéclat|' +
    'Floréclat|Motisma|Toutombe|Tomberro|Gouroutan|Quartermac|Dodoala|' +
    'Embrylex|Ymphect|Tyranocif|Dolman|Bekaglaçon|Wattapik|Bacabouh|' +
    'Trépassable|Ramoloss|Ramoloss de Galar|Flagadoss|Flagadoss de Galar|' +
    'Roigada|Roigada de Galar|Sancoki|Tritosor|Kokiyas|Crustabri|Qwilfish|' +
    'Qwilfish de Hisui|Lovdisc|Écayon|Luminéon|Denticrisse|Mamanbo|' +
    'Venalgue|Kravarech|Flingouste|Gamblast|Anchwatt|Lampéroie|Ohmassacre|' +
    'Vorastérie|Prédastérie|Flamenroule|Minidraco|Draco|Dracolosse|' +
    'Frissonille|Beldeneige|Blizzi|Blizzaroi|Cadoizo|Polarhume|Polagriffe|' +
    'Stalgamin|Oniglali|Momartik|Hexagel|Piétacé|Balbalèze|Grelaçon|' +
    'Séracrawl|Furaiglon|Gueriaigle|Gueriaigle de Hisui|Scalpion|' +
    'Scalproie|Scalpereur|Solochi|Diamat|Trioxhydre|Délestin|Oyacata|' +
    'Nigirigon|Fort-Ivoire|Hurle-Queue|Fongus-Furie|Flotte-Mèche|' +
    'Rampe-Ailes|Pelage-Sablé|Roue-de-Fer|Hotte-de-Fer|Paume-de-Fer|' +
    'Têtes-de-Fer|Mite-de-Fer|Épine-de-Fer|Frigodo|Cryodo|Glaivodo|' +
    'Mordudor|Gromago|Chongjian|Baojian|Dinglu|Yuyu|Rugit-Lune|' +
    'Garde-de-Fer|Koraidon|Miraidon'
  ).split('|'),

  // Pokédex de Septentria — 200 noms
  'kitakami': (
    'Mimigal|Migalos|Yanma|Yanmega|Axoloto|Maraiste|Medhyèna|Grahyèna|' +
    'Muciole|Lumivole|Écrapince|Colhomard|Larveyette|Couverdure|Manternel|' +
    'Bombydou|Rubombelle|Abo|Arbok|Pichu|Pikachu|Raichu|Chétiflor|' +
    'Boustiflor|Empiflor|Fouinette|Fouinar|Étourmi|Étourvol|Étouraptor|' +
    'Mimantis|Floramantis|Verpom|Pomdrapi|Dratatin|Pomdramour|Goupix|' +
    'Feunard|Ptitard|Têtarte|Tartard|Tarpaud|Magicarpe|Léviator|Hoothoot|' +
    'Noarfang|Capumain Violet|Capidextre Violet|Scarhino|Marcacrin|' +
    'Cochignon|Mammochon|Cerfrousse|Grainipiot|Pifeuil|Tengalice|Tarsal|' +
    'Kirlia|Gardevoir|Gallame|Crikzik|Mélokrik|Pachirisu|Riolu|Lucario|' +
    'Chlorobule|Fragilady|Brocélôme|Desséliande|Rocabot|Lougaroc|' +
    'Rongourmand|Rongrigou|Terracool|Terracruel|Poltchageist|Théffroyable|' +
    'Caninos|Arcanin|Racaillou|Gravalanch|Grolem|Manzaï|Simularbre|' +
    'Charpenti|Ouvrifier|Bétochef|Sonistrelle|Bruyverne|Embrochet|' +
    'Hastacuda|Bibichut|Chapotus|Sorcilence|Morpeko Violet|Ferdeter|' +
    'Compagnol|Famignol|Férosinge|Colossinge|Courrousinge|Goinfrex|' +
    'Ronflex|Nénupiot|Lombre|Ludicolo|Tarinor|Tarinorme|Lixy|Luxio|Luxray|' +
    'Larvibule|Chrysapile|Lucanon|Plumeline Style Buyo|Sabelette|' +
    'Sablaireau|Fantominus|Spectrum|Ectoplasma|Scorplane Écarlate|' +
    'Scorvol Écarlate|Malosse|Démolosse|Spoink|Groret|Vostourno|' +
    'Vaututrice|Tiboudet|Bourrinos|Bébécaille|Écaïd|Ékaïser|Lestombaile|' +
    'Smogo|Smogogo|Kungfouine|Shaofouine|Skelénox|Téraclope|Noctunoir|' +
    'Korillon|Éoko|Limagma|Volcaropod|Funécire|Mélancolux|Lugulabre|' +
    'Arakdo|Maskadra|Mélo|Mélofée|Mélodelfe|Archéomire|Archéodong|' +
    'Germéclat|Floréclat|Barpau|Milobellus|Insolourdo|Deusolourdo|' +
    'Barloche|Barbicha|Griknot|Carmache|Carchacrok|Strassie|Tritox|' +
    'Malamandre|Farfuret|Dimoret|Stalgamin|Oniglali|Momartik|Anchwatt|' +
    'Lampéroie|Ohmassacre|Mucuscule|Colimucus|Muplodocus|Couaneton|' +
    'Lakmécygne|Khélocrok|Torgamord|Nigosier Écarlate|Scalpion|Scalproie|' +
    'Scalpereur|Mimiqui|Grimalin|Fourbelin|Angoliath|Wimessir|' +
    'Bargantua Motif Blanc|Paragruel|Ursaking|Félicanis|Fortusimia|' +
    'Favianos|Ogerpon'
  ).split('|'),

  // Pokédex du Disque Indigo — 226 noms
  'blueberry': (
    'Doduo|Dodrio|Noeunoeuf|Rhinocorne|Rhinoféros|Rhinastoc|Mimitoss|' +
    'Aéromite|Élekid|Élektek|Élekable|Magby|Magmar|Maganon|Ptiravi|' +
    'Leveinard|Leuphorie|Insécateur|Cizayox|Hachécateur|Tauros|Zébibron|' +
    'Zéblitz|Girafarig|Farigiraf|Mascaïman|Escroco|Crocorible|Léboulérou|' +
    'Bérasca|Furaiglon|Gueriaigle|Vostourno|Vaututrice|Hélionceau|' +
    'Némélios|Vivaldaim|Haydaim|Queulorior|Motisma|Crèmy|Charmilly|' +
    'Kraknoix|Vibraninf|Libégon|Picassaut|Piclairon|Bazoucan|Tentacool|' +
    'Tentacruel|Hypotrempe|Hypocéan|Hyporoi|Denticrisse|Doudouvet|' +
    'Farfaduvet|Guérilande|Parecool|Vigoroth|Monaflèmit|Mystherbe|Ortide|' +
    'Rafflesia|Joliflor|Mangriff|Séviper|Crabagarre|Crabominable|Loupio|' +
    'Lanturn|Sepiatop|Sepiatroce|Lovdisc|Écayon|Luminéon|Mamanbo|Chartor|' +
    'Passerouge|Braisillon|Flambusard|Araqua|Tarenbulle|Debugant|Kicklee|' +
    'Tygnon|Kapoera|Rototaupe|Minotaupe|Scrutella|Mesmérella|Sidérella|' +
    'Psystigri|Mistigrix|Météno|Kranidos|Charkos|Dinoclier|Bastiodon|' +
    'Chinchidou|Pashmilla|Airmure|Tylton|Altaria|Magnéti|Magnéton|' +
    'Magnézone|Posipi|Négapi|Baggiguane|Baggaïd|Gringolem|Golemastoc|' +
    'Chamallot|Camérupt|Théffroi|Polthégeist|Porygon|Porygon2|Porygon-Z|' +
    'Statitik|Mygavolt|Anchwatt|Lampéroie|Ohmassacre|Terhal|Métang|' +
    'Métalosse|Coupenotte|Incisache|Tranchodon|Otaria|Lamantine|Lokhlass|' +
    'Qwilpik|Nucléos|Méios|Symbios|Snubbull|Granbull|Polarhume|Polagriffe|' +
    'Blizzi|Blizzaroi|Duralugon|Pondralugon|Pomdorochi|Bulbizarre|' +
    'Herbizarre|Florizarre|Salamèche|Reptincel|Dracaufeu|Carapuce|' +
    'Carabaffe|Tortank|Germignon|Macronium|Méganium|Héricendre|Feurisson|' +
    'Typhlosion|Kaiminus|Crocrodil|Aligatueur|Arcko|Massko|Jungko|' +
    'Poussifeu|Galifeu|Braségali|Gobou|Flobio|Laggron|Tortipouss|Boskara|' +
    'Torterra|Ouisticram|Chimpenfeu|Simiabraz|Tiplouf|Prinplouf|Pingoléon|' +
    'Vipélierre|Lianaja|Majaspic|Gruikui|Grotichon|Roitiflam|Moustillon|' +
    'Mateloutre|Clamiral|Marisson|Boguérisse|Blindépique|Feunnec|Roussil|' +
    'Goupelin|Grenousse|Croâporal|Amphinobi|Brindibou|Efflèche|Archéduc|' +
    'Flamiaou|Matoufeu|Félinferno|Otaquin|Otarlette|Oratoria|Ouistempo|' +
    'Badabouin|Gorythmic|Flambino|Lapyro|Pyrobut|Larméléon|Arrozard|' +
    'Lézargus|Feu-Perçant|Ire-Foudre|Chef-de-Fer|Roc-de-Fer|Terapagos|' +
    'Serpente-Eau|Vert-de-Fer|Pêchaminus'
  ).split('|'),

  // Pokédex de Sinnoh — 150 noms
  'original-sinnoh': (
    'Tortipouss|Boskara|Torterra|Ouisticram|Chimpenfeu|Simiabraz|Tiplouf|' +
    'Prinplouf|Pingoléon|Étourmi|Étourvol|Étouraptor|Keunotor|Castorno|' +
    'Crikzik|Mélokrik|Lixy|Luxio|Luxray|Abra|Kadabra|Alakazam|Magicarpe|' +
    'Léviator|Rozbouton|Rosélia|Roserade|Nosferapti|Nosferalto|Nostenfer|' +
    'Racaillou|Gravalanch|Grolem|Onix|Steelix|Kranidos|Charkos|Dinoclier|' +
    'Bastiodon|Machoc|Machopeur|Mackogneur|Psykokwak|Akwakwak|Cheniti|' +
    'Cheniselle|Papilord|Chenipotte|Armulys|Charmillon|Blindalys|Papinox|' +
    'Apitrini|Apireine|Pachirisu|Mustébouée|Mustéflott|Ceribou|Ceriflor|' +
    'Sancoki|Tritosor|Scarhino|Capumain|Capidextre|Baudrive|Grodrive|' +
    'Laporeille|Lockpin|Fantominus|Spectrum|Ectoplasma|Feuforêve|Magirêve|' +
    'Cornèbre|Corboss|Chaglam|Chaffreux|Poissirène|Poissoroy|Barloche|' +
    'Barbicha|Korillon|Éoko|Moufouette|Moufflair|Méditikka|Charmina|' +
    'Archéomire|Archéodong|Ponyta|Galopa|Manzaï|Simularbre|Mime Jr.|' +
    'M. Mime|Ptiravi|Leveinard|Leuphorie|Mélo|Mélofée|Mélodelfe|Pijako|' +
    'Pichu|Pikachu|Raichu|Hoothoot|Noarfang|Spiritomb|Griknot|Carmache|' +
    'Carchacrok|Goinfrex|Ronflex|Zarbi|Riolu|Lucario|Axoloto|Maraiste|' +
    'Goélise|Bekipan|Girafarig|Hippopotas|Hippodocus|Azurill|Marill|' +
    'Azumarill|Rapion|Drascore|Cradopaud|Coatox|Vortente|Rémoraid|' +
    'Octillery|Écayon|Luminéon|Tentacool|Tentacruel|Barpau|Milobellus|' +
    'Babimanta|Démanta|Blizzi|Blizzaroi|Farfuret|Dimoret|Créhelf|' +
    'Créfollet|Créfadet|Dialga|Palkia'
  ).split('|'),

  // Pokédex de Galar — 406 noms
  'galar': (
    'Ouistempo|Badabouin|Gorythmic|Flambino|Lapyro|Pyrobut|Larméléon|' +
    'Arrozard|Lézargus|Larvadar|Coléodôme|Astronelle|Chenipan|Chrysacier|' +
    'Papilusion|Larvibule|Chrysapile|Lucanon|Hoothoot|Noarfang|Minisange|' +
    'Bleuseille|Corvaillus|Rongourmand|Rongrigou|Poichigeon|Colombeau|' +
    'Déflaisan|Goupilou|Roublenard|Zigzaton de Galar|Linéon de Galar|Ixon|' +
    'Moumouton|Moumouflon|Nénupiot|Lombre|Ludicolo|Grainipiot|Pifeuil|' +
    'Tengalice|Khélocrok|Torgamord|Chacripan|Léopardus|Voltoutou|Fulgudog|' +
    'Sapereau|Excavarenne|Chinchidou|Pashmilla|Croquine|Candine|Sucreine|' +
    'Mystherbe|Ortide|Rafflesia|Joliflor|Rozbouton|Rosélia|Roserade|' +
    'Goélise|Bekipan|Statitik|Mygavolt|Dynavolt|Élecsprint|Goupix|Feunard|' +
    'Caninos|Arcanin|Sorbébé|Sorboul|Sorbouboul|Marcacrin|Cochignon|' +
    'Mammochon|Cadoizo|Stalgamin|Oniglali|Momartik|Balbuto|Kaorine|' +
    'Tiboudet|Bourrinos|Crabicoque|Crabaraque|Gringolem|Golemastoc|Munna|' +
    'Mushana|Natu|Xatu|Nounourson|Chelours|Blizzi|Blizzaroi|Krabby|' +
    'Krabboss|Axoloto|Maraiste|Écrapince|Colhomard|Ningale|Ninjask|Munja|' +
    'Debugant|Kicklee|Tygnon|Kapoera|Pandespiègle|Pandarbare|Tic|Clic|' +
    'Cliticlic|Apitrini|Apireine|Archéomire|Archéodong|Tarsal|Kirlia|' +
    'Gardevoir|Gallame|Baudrive|Grodrive|Tournicoton|Blancoton|Ceribou|' +
    'Ceriflor|Moufouette|Moufflair|Tritonde|Batracné|Crapustule|Skelénox|' +
    'Téraclope|Noctunoir|Machoc|Machopeur|Mackogneur|Fantominus|Spectrum|' +
    'Ectoplasma|Magicarpe|Léviator|Poissirène|Poissoroy|Rémoraid|' +
    'Octillery|Kokiyas|Crustabri|Barpau|Milobellus|Bargantua|Froussardine|' +
    'Concombaffe|Miamiasme|Miasmax|Grillepattes|Scolocendre|Charbi|' +
    'Wagomine|Monthracite|Taupiqueur|Triopikeur|Rototaupe|Minotaupe|' +
    'Nodulithe|Géolithe|Gigalithe|Charpenti|Ouvrifier|Bétochef|Chovsourir|' +
    'Rhinolove|Sonistrelle|Bruyverne|Onix|Steelix|Embrochet|Hastacuda|' +
    'Miaouss de Galar|Miaouss|Berserkatt|Persian|Crèmy|Charmilly|Bombydou|' +
    'Rubombelle|Grindur|Noacier|Pitrouille|Banshitrouye|Pichu|Pikachu|' +
    'Raichu|Évoli|Aquali|Voltali|Pyroli|Mentali|Noctali|Phyllali|Givrali|' +
    'Nymphali|Verpom|Pomdrapi|Dratatin|Psystigri|Mistigrix|Sucroquin|' +
    'Cupcanaille|Fluvetin|Cocotine|Araqua|Tarenbulle|Okéoké|Qulbutoké|' +
    'Canarticho de Galar|Palarticho|Loupio|Lanturn|Cradopaud|Coatox|' +
    'Baggiguane|Baggaïd|Limonde de Galar|Limonde|Caratroc|Barloche|' +
    'Barbicha|Sancoki|Tritosor|Sovkipou|Sarmuraï|Opermine|Golgopathe|' +
    'Corayon de Galar|Corayon|Corayôme|Grimalin|Fourbelin|Angoliath|' +
    'Bibichut|Chapotus|Sorcilence|Tritox|Malamandre|Scalpion|Scalproie|' +
    'Judokrak|Karaclée|Smogo|Smogogo de Galar|Manzaï|Simularbre|Mélo|' +
    'Mélofée|Mélodelfe|Togepi|Togetic|Togekiss|Goinfrex|Ronflex|Doudouvet|' +
    'Farfaduvet|Rhinocorne|Rhinoféros|Rhinastoc|Scrutella|Mesmérella|' +
    'Sidérella|Nucléos|Méios|Symbios|Carabing|Lançargot|Escargaume|' +
    'Limaspeed|Lewsor|Neitram|Polarhume|Polagriffe|Furaiglon|Gueriaigle|' +
    'Vostourno|Vaututrice|Rapion|Drascore|Funécire|Mélancolux|Lugulabre|' +
    'Sepiatop|Sepiatroce|Farfuret|Dimoret|Ténéfix|Mysdibule|Maracachi|' +
    'Cryptéro|Riolu|Lucario|Chartor|Mimiqui|Charibari|Pachyradjah|' +
    'Qwilfish|Viskuse|Moyade|Vorastérie|Prédastérie|Nigosier|Toxizap|' +
    'Salarsen|Dunaja|Dunaconda|Hippopotas|Hippodocus|Fermite|Aflamanoir|' +
    'Galvaran|Iguolta|Brutalibré|Kraknoix|Vibraninf|Libégon|Coupenotte|' +
    'Incisache|Tranchodon|Tutafeh de Galar|Tutafeh|Tutétékri|Tutankafer|' +
    'Monorpale|Dimoclès|Exagide|Ponyta de Galar|Galopa de Galar|Théffroi|' +
    'Polthégeist|Wimessir|Brocélôme|Desséliande|Spododo|Lampignon|' +
    'Gouroutan|Quartermac|Morpeko|Hexadron|Draïeul|Boumata|Togedemaru|' +
    'Frissonille|Beldeneige|Poulpaf|Krakos|Wattapik|Babimanta|Démanta|' +
    'Wailmer|Wailord|Grelaçon|Séracrawl|Sinistrail|Lokhlass|Séléroc|' +
    'Solaroc|Mime Jr.|M. Mime de Galar|M. Mime|M. Glaquette|' +
    'Darumarond de Galar|Darumacho de Galar|Darumacho|Dolman|Bekaglaçon|' +
    'Duralugon|Motisma|Métamorph|Galvagon|Galvagla|Hydragon|Hydragla|' +
    'Salamèche|Reptincel|Dracaufeu|Type:0|Silvallié|Embrylex|Ymphect|' +
    'Tyranocif|Solochi|Diamat|Trioxhydre|Mucuscule|Colimucus|Muplodocus|' +
    'Bébécaille|Écaïd|Ékaïser|Fantyrm|Dispareptil|Lanssorien|Zacian|' +
    'Zamazenta|Éthernatos'
  ).split('|'),

  // Pokédex d'Isolarmure — 211 noms
  'isle-of-armor': (
    'Ramoloss de Galar|Flagadoss de Galar|Roigada|Laporeille|Lockpin|' +
    'Ptiravi|Leveinard|Leuphorie|Rongourmand|Rongrigou|Toudoudou|' +
    'Rondoudou|Grodoudou|Larvadar|Coléodôme|Astronelle|Mimantis|' +
    'Floramantis|Verpom|Pomdrapi|Dratatin|Passerouge|Braisillon|' +
    'Flambusard|Lixy|Luxio|Luxray|Trousselin|Scalpion|Scalproie|Abra|' +
    'Kadabra|Alakazam|Tarsal|Kirlia|Gardevoir|Gallame|Krabby|Krabboss|' +
    'Tentacool|Tentacruel|Magicarpe|Léviator|Rémoraid|Octillery|Babimanta|' +
    'Démanta|Goélise|Bekipan|Rapion|Drascore|Insolourdo|Frison|Excelangue|' +
    'Coudlangue|Khélocrok|Torgamord|Axoloto|Maraiste|Mucuscule|Colimucus|' +
    'Muplodocus|Drakkarmin|Escargaume|Limaspeed|Carabing|Lançargot|' +
    'Bulbizarre|Herbizarre|Florizarre|Carapuce|Carabaffe|Tortank|' +
    'Venipatte|Scobolide|Brutapode|Trompignon|Gaulet|Guérilande|' +
    'Saquedeneu|Bouldeneu|Cradopaud|Coatox|Pichu|Pikachu|Raichu|Zorua|' +
    'Zoroark|Gouroutan|Quartermac|Écrapince|Colhomard|Nigosier|Poissirène|' +
    'Poissoroy|Embrochet|Hastacuda|Stari|Staross|Wushours|Shifours|Emolga|' +
    'Dedenne|Morpeko|Magnéti|Magnéton|Magnézone|Sepiatop|Sepiatroce|' +
    'Froussardine|Carvanha|Sharpedo|Ponchiot|Ponchien|Mastouffe|Tauros|' +
    'Écrémeuh|Insécateur|Cizayox|Scarabrute|Scarhino|Crabicoque|' +
    'Crabaraque|Sovkipou|Sarmuraï|Wattapik|Vorastérie|Prédastérie|Poulpaf|' +
    'Krakos|Kokiyas|Crustabri|Bacabouh|Trépassable|Baudrive|Grodrive|' +
    'Barloche|Barbicha|Azurill|Marill|Azumarill|Ptitard|Têtarte|Tartard|' +
    'Tarpaud|Psykokwak|Akwakwak|Chuchmur|Ramboum|Brouhabam|Chovsourir|' +
    'Rhinolove|Airmure|Nodulithe|Géolithe|Gigalithe|Rocabot|Lougaroc|' +
    'Tritox|Malamandre|Baggiguane|Baggaïd|Kungfouine|Shaofouine|' +
    'Bébécaille|Écaïd|Ékaïser|Sabelette|Sablaireau|Osselait|Ossatueur|' +
    'Kangourex|Chartor|Dunaja|Dunaconda|Mascaïman|Escroco|Crocorible|' +
    'Furaiglon|Gueriaigle|Vostourno|Vaututrice|Rhinocorne|Rhinoféros|' +
    'Rhinastoc|Pyronille|Pyrax|Loupio|Lanturn|Wailmer|Wailord|Viskuse|' +
    'Moyade|Venalgue|Kravarech|Flingouste|Gamblast|Hypotrempe|Hypocéan|' +
    'Hyporoi|Chlorobule|Fragilady|Apitrini|Apireine|Noeunoeuf|Noadkoko|' +
    'Métamorph|Porygon|Porygon2|Porygon-Z|Zarude'
  ).split('|'),

  // Pokédex de Couronneige — 210 noms
  'crown-tundra': (
    'Frissonille|Beldeneige|Moumouton|Moumouflon|Rongourmand|Rongrigou|' +
    'Marcacrin|Cochignon|Mammochon|Mime Jr.|M. Mime de Galar|M. Glaquette|' +
    'Lippouti|Lippoutou|Élekid|Élektek|Élekable|Magby|Magmar|Maganon|' +
    'Nanméouïe|Sorbébé|Sorboul|Sorbouboul|Stalgamin|Oniglali|Momartik|' +
    'Farfuret|Dimoret|Hexagel|Blizzi|Blizzaroi|Brocélôme|Desséliande|' +
    'Tylton|Altaria|Grimalin|Fourbelin|Angoliath|Bibichut|Chapotus|' +
    'Sorcilence|Mélo|Mélofée|Mélodelfe|Mimiqui|Spiritomb|Funécire|' +
    'Mélancolux|Lugulabre|Scrutella|Mesmérella|Sidérella|Nucléos|Méios|' +
    'Symbios|Charpenti|Ouvrifier|Bétochef|Barloche|Barbicha|Magicarpe|' +
    'Léviator|Bargantua|Nidoran♀|Nidorina|Nidoqueen|Nidoran♂|Nidorino|' +
    'Nidoking|Zigzaton de Galar|Linéon de Galar|Ixon|Évoli|Aquali|Voltali|' +
    'Pyroli|Noctali|Mentali|Givrali|Phyllali|Nymphali|Ptyranidur|' +
    'Rexillius|Amagara|Dragmara|Archéomire|Archéodong|Dolman|Bekaglaçon|' +
    'Araqua|Tarenbulle|Statitik|Mygavolt|Carabing|Lançargot|Escargaume|' +
    'Limaspeed|Grillepattes|Scolocendre|Fermite|Aflamanoir|' +
    'Darumarond de Galar|Darumacho de Galar|Ponyta de Galar|' +
    'Galopa de Galar|Absol|Charibari|Pachyradjah|Fantyrm|Dispareptil|' +
    'Lanssorien|Draby|Drackhaus|Drattak|Griknot|Carmache|Carchacrok|' +
    'Drakkarmin|Cadoizo|Polarhume|Polagriffe|Amonita|Amonistar|Kabuto|' +
    'Kabutops|Ptéra|Strassie|Terhal|Métang|Métalosse|Théffroi|Polthégeist|' +
    'Riolu|Lucario|Solochi|Diamat|Trioxhydre|Embrylex|Ymphect|Tyranocif|' +
    'Grelaçon|Séracrawl|Nosferapti|Nosferalto|Nostenfer|Carapagos|' +
    'Mégapagos|Arkéapti|Aéroptéryx|Balbuto|Kaorine|Gringolem|Golemastoc|' +
    'Voltoutou|Fulgudog|Morpeko|Wattapik|Obalie|Phogleur|Kaimorse|' +
    'Sinistrail|Minisange|Bleuseille|Corvaillus|Tournicoton|Blancoton|' +
    'Doudouvet|Farfaduvet|Caratroc|Wimessir|Goinfrex|Ronflex|Ténéfix|' +
    'Mysdibule|Charbi|Wagomine|Monthracite|Grindur|Noacier|Sonistrelle|' +
    'Bruyverne|Lilia|Vacilys|Anorith|Armaldo|Relicanth|Barpau|Milobellus|' +
    'Lokhlass|Galekid|Galegon|Galeking|Minidraco|Draco|Dracolosse|' +
    'Regirock|Regice|Registeel|Regieleki|Regidrago|Artikodin de Galar|' +
    'Électhor de Galar|Sulfura de Galar|Cobaltium|Terrakium|Viridium|' +
    'Blizzeval|Spectreval|Sylveroy'
  ).split('|'),

  // Pokédex de Kanto (Let's Go) — 171 noms
  'letsgo-kanto': (
    'Bulbizarre|Herbizarre|Florizarre|Salamèche|Reptincel|Dracaufeu|' +
    'Carapuce|Carabaffe|Tortank|Chenipan|Chrysacier|Papilusion|Aspicot|' +
    'Coconfort|Dardargnan|Roucool|Roucoups|Roucarnage|Rattata|' +
    'Rattata d\'Alola|Rattatac|Rattatac d\'Alola|Piafabec|Rapasdepic|Abo|' +
    'Arbok|Pikachu|Raichu|Raichu d\'Alola|Sabelette|Sabelette d\'Alola|' +
    'Sablaireau|Sablaireau d\'Alola|Nidoran ♀|Nidorina|Nidoqueen|Nidoran ♂|' +
    'Nidorino|Nidoking|Mélofée|Mélodelfe|Goupix|Goupix d\'Alola|Feunard|' +
    'Feunard d\'Alola|Rondoudou|Grodoudou|Nosferapti|Nosferalto|Mystherbe|' +
    'Ortide|Rafflesia|Paras|Parasect|Mimitoss|Aéromite|Taupiqueur|' +
    'Taupiqueur d\'Alola|Triopikeur|Triopikeur d\'Alola|Miaouss|' +
    'Miaouss d\'Alola|Persian|Persian d\'Alola|Psykokwak|Akwakwak|Férosinge|' +
    'Colossinge|Caninos|Arcanin|Ptitard|Têtarte|Tartard|Abra|Kadabra|' +
    'Alakazam|Machoc|Machopeur|Mackogneur|Chétiflor|Boustiflor|Empiflor|' +
    'Tentacool|Tentacruel|Racaillou|Racaillou d\'Alola|Gravalanch|' +
    'Gravalanch d\'Alola|Grolem|Grolem d\'Alola|Ponyta|Galopa|Ramoloss|' +
    'Flagadoss|Magnéti|Magnéton|Canarticho|Doduo|Dodrio|Otaria|Lamantine|' +
    'Tadmorv|Tadmorv d\'Alola|Grotadmorv|Grotadmorv d\'Alola|Kokiyas|' +
    'Crustabri|Fantominus|Spectrum|Ectoplasma|Onix|Soporifik|Hypnomade|' +
    'Krabby|Krabboss|Voltorbe|Électrode|Noeunoeuf|Noadkoko|' +
    'Noadkoko d\'Alola|Osselait|Ossatueur|Ossatueur d\'Alola|Kicklee|Tygnon|' +
    'Excelangue|Smogo|Smogogo|Rhinocorne|Rhinoféros|Leveinard|Saquedeneu|' +
    'Kangourex|Hypotrempe|Hypocéan|Poissirène|Poissoroy|Stari|Staross|' +
    'M. Mime|Insécateur|Lippoutou|Élektek|Magmar|Scarabrute|Tauros|' +
    'Magicarpe|Léviator|Lokhlass|Métamorph|Évoli|Aquali|Voltali|Pyroli|' +
    'Porygon|Amonita|Amonistar|Kabuto|Kabutops|Ptéra|Ronflex|Artikodin|' +
    'Électhor|Sulfura|Minidraco|Draco|Dracolosse|Mewtwo|Mew|Meltan|' +
    'Melmetal'
  ).split('|'),

  // Pokédex National jusqu'à Arceus — 493 noms
  'national-gen4': (
    'Bulbizarre|Herbizarre|Florizarre|Salamèche|Reptincel|Dracaufeu|' +
    'Carapuce|Carabaffe|Tortank|Chenipan|Chrysacier|Papilusion|Aspicot|' +
    'Coconfort|Dardargnan|Roucool|Roucoups|Roucarnage|Rattata|Rattatac|' +
    'Piafabec|Rapasdepic|Abo|Arbok|Pikachu|Raichu|Sabelette|Sablaireau|' +
    'Nidoran♀|Nidorina|Nidoqueen|Nidoran♂|Nidorino|Nidoking|Mélofée|' +
    'Mélodelfe|Goupix|Feunard|Rondoudou|Grodoudou|Nosferapti|Nosferalto|' +
    'Mystherbe|Ortide|Rafflesia|Paras|Parasect|Mimitoss|Aéromite|' +
    'Taupiqueur|Triopikeur|Miaouss|Persian|Psykokwak|Akwakwak|Férosinge|' +
    'Colossinge|Caninos|Arcanin|Ptitard|Têtarte|Tartard|Abra|Kadabra|' +
    'Alakazam|Machoc|Machopeur|Mackogneur|Chétiflor|Boustiflor|Empiflor|' +
    'Tentacool|Tentacruel|Racaillou|Gravalanch|Grolem|Ponyta|Galopa|' +
    'Ramoloss|Flagadoss|Magnéti|Magnéton|Canarticho|Doduo|Dodrio|Otaria|' +
    'Lamantine|Tadmorv|Grotadmorv|Kokiyas|Crustabri|Fantominus|Spectrum|' +
    'Ectoplasma|Onix|Soporifik|Hypnomade|Krabby|Krabboss|Voltorbe|' +
    'Électrode|Noeunoeuf|Noadkoko|Osselait|Ossatueur|Kicklee|Tygnon|' +
    'Excelangue|Smogo|Smogogo|Rhinocorne|Rhinoféros|Leveinard|Saquedeneu|' +
    'Kangourex|Hypotrempe|Hypocéan|Poissirène|Poissoroy|Stari|Staross|' +
    'M. Mime|Insécateur|Lippoutou|Élektek|Magmar|Scarabrute|Tauros|' +
    'Magicarpe|Léviator|Lokhlass|Métamorph|Évoli|Aquali|Voltali|Pyroli|' +
    'Porygon|Amonita|Amonistar|Kabuto|Kabutops|Ptéra|Ronflex|Artikodin|' +
    'Électhor|Sulfura|Minidraco|Draco|Dracolosse|Mewtwo|Mew|Germignon|' +
    'Macronium|Méganium|Héricendre|Feurisson|Typhlosion|Kaiminus|' +
    'Crocrodil|Aligatueur|Fouinette|Fouinar|Hoothoot|Noarfang|Coxy|' +
    'Coxyclaque|Mimigal|Migalos|Nostenfer|Loupio|Lanturn|Pichu|Mélo|' +
    'Toudoudou|Togepi|Togetic|Natu|Xatu|Wattouat|Lainergie|Pharamp|' +
    'Joliflor|Marill|Azumarill|Simularbre|Tarpaud|Granivol|Floravol|' +
    'Cotovol|Capumain|Tournegrin|Héliatronc|Yanma|Axoloto|Maraiste|' +
    'Mentali|Noctali|Cornèbre|Roigada|Feuforêve|Zarbi|Qulbutoké|Girafarig|' +
    'Pomdepik|Foretress|Insolourdo|Scorplane|Steelix|Snubbull|Granbull|' +
    'Qwilfish|Cizayox|Caratroc|Scarhino|Farfuret|Teddiursa|Ursaring|' +
    'Limagma|Volcaropod|Marcacrin|Cochignon|Corayon|Rémoraid|Octillery|' +
    'Cadoizo|Démanta|Airmure|Malosse|Démolosse|Hyporoi|Phanpy|Donphan|' +
    'Porygon2|Cerfrousse|Queulorior|Debugant|Kapoera|Lippouti|Élekid|' +
    'Magby|Écrémeuh|Leuphorie|Raikou|Entei|Suicune|Embrylex|Ymphect|' +
    'Tyranocif|Lugia|Ho-Oh|Celebi|Arcko|Massko|Jungko|Poussifeu|Galifeu|' +
    'Braségali|Gobou|Flobio|Laggron|Medhyèna|Grahyèna|Zigzaton|Linéon|' +
    'Chenipotte|Armulys|Charmillon|Blindalys|Papinox|Nénupiot|Lombre|' +
    'Ludicolo|Grainipiot|Pifeuil|Tengalice|Nirondelle|Hélédelle|Goélise|' +
    'Bekipan|Tarsal|Kirlia|Gardevoir|Arakdo|Maskadra|Balignon|Chapignon|' +
    'Parecool|Vigoroth|Monaflèmit|Ningale|Ninjask|Munja|Chuchmur|Ramboum|' +
    'Brouhabam|Makuhita|Hariyama|Azurill|Tarinor|Skitty|Delcatty|Ténéfix|' +
    'Mysdibule|Galekid|Galegon|Galeking|Méditikka|Charmina|Dynavolt|' +
    'Élecsprint|Posipi|Négapi|Muciole|Lumivole|Rosélia|Gloupti|Avaltout|' +
    'Carvanha|Sharpedo|Wailmer|Wailord|Chamallot|Camérupt|Chartor|Spoink|' +
    'Groret|Spinda|Kraknoix|Vibraninf|Libégon|Cacnea|Cacturne|Tylton|' +
    'Altaria|Mangriff|Séviper|Séléroc|Solaroc|Barloche|Barbicha|Écrapince|' +
    'Colhomard|Balbuto|Kaorine|Lilia|Vacilys|Anorith|Armaldo|Barpau|' +
    'Milobellus|Morphéo|Kecleon|Polichombr|Branette|Skelénox|Téraclope|' +
    'Tropius|Éoko|Absol|Okéoké|Stalgamin|Oniglali|Obalie|Phogleur|' +
    'Kaimorse|Coquiperl|Serpang|Rosabyss|Relicanth|Lovdisc|Draby|' +
    'Drackhaus|Drattak|Terhal|Métang|Métalosse|Regirock|Regice|Registeel|' +
    'Latias|Latios|Kyogre|Groudon|Rayquaza|Jirachi|Deoxys|Tortipouss|' +
    'Boskara|Torterra|Ouisticram|Chimpenfeu|Simiabraz|Tiplouf|Prinplouf|' +
    'Pingoléon|Étourmi|Étourvol|Étouraptor|Keunotor|Castorno|Crikzik|' +
    'Mélokrik|Lixy|Luxio|Luxray|Rozbouton|Roserade|Kranidos|Charkos|' +
    'Dinoclier|Bastiodon|Cheniti|Cheniselle|Papilord|Apitrini|Apireine|' +
    'Pachirisu|Mustébouée|Mustéflott|Ceribou|Ceriflor|Sancoki|Tritosor|' +
    'Capidextre|Baudrive|Grodrive|Laporeille|Lockpin|Magirêve|Corboss|' +
    'Chaglam|Chaffreux|Korillon|Moufouette|Moufflair|Archéomire|' +
    'Archéodong|Manzaï|Mime Jr.|Ptiravi|Pijako|Spiritomb|Griknot|Carmache|' +
    'Carchacrok|Goinfrex|Riolu|Lucario|Hippopotas|Hippodocus|Rapion|' +
    'Drascore|Cradopaud|Coatox|Vortente|Écayon|Luminéon|Babimanta|Blizzi|' +
    'Blizzaroi|Dimoret|Magnézone|Coudlangue|Rhinastoc|Bouldeneu|Élekable|' +
    'Maganon|Togekiss|Yanmega|Phyllali|Givrali|Scorvol|Mammochon|' +
    'Porygon-Z|Gallame|Tarinorme|Noctunoir|Momartik|Motisma|Créhelf|' +
    'Créfollet|Créfadet|Dialga|Palkia|Heatran|Regigigas|Giratina|' +
    'Cresselia|Phione|Manaphy|Darkrai|Shaymin|Arceus'
  ).split('|')
};

// Ce que le relevé attend pour un Pokédex donné, ou null s'il ne le connaît pas.
function relevePokedex(cle){
  return RELEVE_POKEDEX[cle] || null;
}
