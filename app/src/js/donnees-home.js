// Ce que Pokémon HOME accepte réellement en boîte — RELEVÉ À LA MAIN.
//
// Source : Pokékalos, « Pokémon HOME - Pokémon déposables », relevé le
// 22 août 2026 (page publiée le 01/06/2023, dernière édition le 05/07/2024).
//   https://www.pokekalos.fr/jeux/autres/home/articles-pokemon-deposables-5422.html
//
// Ce fichier ne sert PAS à construire le Pokédex : les identifiants ci-dessous
// sont ceux de Pokékalos (noms français), pas ceux de PokeAPI, et les deux ne
// se correspondent pas mécaniquement. Il sert de référence au banc d'essai, qui
// vérifie que le périmètre HOME de l'application ne s'en écarte pas.
//
// Ce que le relevé confirme, et qui vaut la peine d'être dit :
//   · aucune Méga-Évolution, aucune Primo-Résurgence, aucun Gigamax ;
//   · aucun Pikachu Cosplay (ceux d'ORAS ne se transfèrent pas) ;
//   · un seul Koraidon et un seul Miraidon — les « builds » n'existent pas ;
//   · un seul Zygarde 50 % : Synergie est un talent, pas une forme ;
//   · sept Météno, un par couleur de noyau, et non quatorze.
//
// Les quatre niveaux sont cumulatifs : chacun contient les précédents.

const HOME_NIVEAUX = {

  // --- 1. Forme normale : une entrée par espèce -----------------------------
  // Nidoran♀ est ici, et non dans « genre » : c'est une espèce à part entière,
  // pas la femelle de Nidoran♂. Son identifiant se termine en « -f » comme une
  // femelle, ce qui trompe le classement automatique — d'où cette note.
  base:
    'bulbizarre herbizarre florizarre salameche reptincel dracaufeu carapuce carabaffe tortank '
    + 'chenipan chrysacier papilusion aspicot coconfort dardargnan roucool roucoups roucarnage '
    + 'rattata rattatac piafabec rapasdepic abo arbok pikachu raichu sabelette sablaireau '
    + 'nidoran-f nidorina nidoqueen nidoran-m nidorino nidoking melofee melodelfe goupix feunard '
    + 'rondoudou grodoudou nosferapti nosferalto mystherbe ortide rafflesia paras parasect '
    + 'mimitoss aeromite taupiqueur triopikeur miaouss persian psykokwak akwakwak ferosinge '
    + 'colossinge caninos arcanin ptitard tetarte tartard abra kadabra alakazam machoc machopeur '
    + 'mackogneur chetiflor boustiflor empiflor tentacool tentacruel racaillou gravalanch grolem '
    + 'ponyta galopa ramoloss flagadoss magneti magneton canarticho doduo dodrio otaria lamantine '
    + 'tadmorv grotadmorv kokiyas crustabri fantominus spectrum ectoplasma onix soporifik '
    + 'hypnomade krabby krabboss voltorbe electrode noeunoeuf noadkoko osselait ossatueur kicklee '
    + 'tygnon excelangue smogo smogogo rhinocorne rhinoferos leveinard saquedeneu kangourex '
    + 'hypotrempe hypocean poissirene poissoroy stari staross mmime insecateur lippoutou elektek '
    + 'magmar scarabrute tauros magicarpe leviator lokhlass metamorph evoli aquali voltali pyroli '
    + 'porygon amonita amonistar kabuto kabutops ptera ronflex artikodin electhor sulfura '
    + 'minidraco draco dracolosse mewtwo mew germignon macronium meganium hericendre feurisson '
    + 'typhlosion kaiminus crocrodil aligatueur fouinette fouinar hoothoot noarfang coxy '
    + 'coxyclaque mimigal migalos nostenfer loupio lanturn pichu melo toudoudou togepi togetic '
    + 'natu xatu wattouat lainergie pharamp joliflor marill azumarill simularbre tarpaud granivol '
    + 'floravol cotovol capumain tournegrin heliatronc yanma axoloto maraiste mentali noctali '
    + 'cornebre roigada feuforeve zarbi-a qulbutoke girafarig pomdepik foretress insolourdo '
    + 'scorplane steelix snubbull granbull qwilfish cizayox caratroc scarhino farfuret teddiursa '
    + 'ursaring limagma volcaropod marcacrin cochignon corayon remoraid octillery cadoizo demanta '
    + 'airmure malosse demolosse hyporoi phanpy donphan porygon2 cerfrousse queulorior debugant '
    + 'kapoera lippouti elekid magby ecremeuh leuphorie raikou entei suicune embrylex ymphect '
    + 'tyranocif lugia ho-oh celebi arcko massko jungko poussifeu galifeu brasegali gobou flobio '
    + 'laggron medhyena grahyena zigzaton lineon chenipotte armulys charmillon blindalys papinox '
    + 'nenupiot lombre ludicolo grainipiot pifeuil tengalice nirondelle heledelle goelise bekipan '
    + 'tarsal kirlia gardevoir arakdo maskadra balignon chapignon parecool vigoroth monaflemit '
    + 'ningale ninjask munja chuchmur ramboum brouhabam makuhita hariyama azurill tarinor skitty '
    + 'delcatty tenefix mysdibule galekid galegon galeking meditikka charmina dynavolt elecsprint '
    + 'posipi negapi muciole lumivole roselia gloupti avaltout carvanha sharpedo wailmer wailord '
    + 'chamallot camerupt chartor spoink groret spinda kraknoix vibraninf libegon cacnea cacturne '
    + 'tylton altaria mangriff seviper seleroc solaroc barloche barbicha ecrapince colhomard '
    + 'balbuto kaorine lilia vacilys anorith armaldo barpau milobellus morpheo kecleon polichombr '
    + 'branette skelenox teraclope tropius eoko absol okeoke stalgamin oniglali obalie phogleur '
    + 'kaimorse coquiperl serpang rosabyss relicanth lovdisc draby drackhaus drattak terhal '
    + 'metang metalosse regirock regice registeel latias latios kyogre groudon rayquaza jirachi '
    + 'deoxys tortipouss boskara torterra ouisticram chimpenfeu simiabraz tiplouf prinplouf '
    + 'pingoleon etourmi etourvol etouraptor keunotor castorno crikzik melokrik lixy luxio luxray '
    + 'rozbouton roserade kranidos charkos dinoclier bastiodon cheniti cheniselle papilord '
    + 'apitrini apireine pachirisu mustebouee musteflott ceribou ceriflor sancoki-mer-occident '
    + 'tritosor-mer-occident capidextre baudrive grodrive laporeille lockpin magireve corboss '
    + 'chaglam chaffreux korillon moufouette moufflair archeomire archeodong manzai mime-jr '
    + 'ptiravi pijako spiritomb griknot carmache carchacrok goinfrex riolu lucario hippopotas '
    + 'hippodocus rapion drascore cradopaud coatox vortente ecayon lumineon babimanta blizzi '
    + 'blizzaroi dimoret magnezone coudlangue rhinastoc bouldeneu elekable maganon togekiss '
    + 'yanmega phyllali givrali scorvol mammochon porygon-z gallame tarinorme noctunoir momartik '
    + 'motisma crehelf crefollet crefadet dialga palkia heatran regigigas giratina cresselia '
    + 'phione manaphy darkrai shaymin arceus victini vipelierre lianaja majaspic gruikui '
    + 'grotichon roitiflam moustillon mateloutre clamiral ratentif miradar ponchiot ponchien '
    + 'mastouffe chacripan leopardus feuillajou feuiloutan flamajou flamoutan flotajou flotoutan '
    + 'munna mushana poichigeon colombeau deflaisan zebibron zeblitz nodulithe geolithe gigalithe '
    + 'chovsourir rhinolove rototaupe minotaupe nanmeouie charpenti ouvrifier betochef tritonde '
    + 'batracne crapustule judokrak karaclee larveyette couverdure manternel venipatte scobolide '
    + 'brutapode doudouvet farfaduvet chlorobule fragilady bargantua mascaiman escroco crocorible '
    + 'darumarond darumacho maracachi crabicoque crabaraque baggiguane baggaid cryptero tutafeh '
    + 'tutankafer carapagos megapagos arkeapti aeropteryx miamiasme miasmax zorua zoroark '
    + 'chinchidou pashmilla scrutella mesmerella siderella nucleos meios symbios couaneton '
    + 'lakmecygne sorbebe sorboul sorbouboul vivaldaim-forme-printemps haydaim-forme-printemps '
    + 'emolga carabing lancargot trompignon gaulet viskuse moyade mamanbo statitik mygavolt '
    + 'grindur noacier tic clic cliticlic anchwatt lamperoie ohmassacre lewsor neitram funecire '
    + 'melancolux lugulabre coupenotte incisache tranchodon polarhume polagriffe hexagel '
    + 'escargaume limaspeed limonde kungfouine shaofouine drakkarmin gringolem golemastoc '
    + 'scalpion scalproie frison furaiglon gueriaigle vostourno vaututrice aflamanoir fermite '
    + 'solochi diamat trioxhydre pyronille pyrax cobaltium terrakium viridium boreas fulguris '
    + 'reshiram zekrom demeteros kyurem keldeo meloetta genesect marisson boguerisse blindepique '
    + 'feunnec roussil goupelin grenousse croaporal amphinobi sapereau excavarenne passerouge '
    + 'braisillon flambusard lepidonille peregrain prismillon helionceau nemelios flabebe floette '
    + 'florges cabriolaine chevroum pandespiegle pandarbare couafarel psystigri mistigrix '
    + 'monorpale dimocles exagide fluvetin cocotine sucroquin cupcanaille sepiatop sepiatroce '
    + 'opermine golgopathe venalgue kravarech flingouste gamblast galvaran iguolta ptyranidur '
    + 'rexillius amagara dragmara nymphali brutalibre dedenne strassie mucuscule colimucus '
    + 'muplodocus trousselin brocelome desseliande pitrouille banshitrouye grelacon seracrawl '
    + 'sonistrelle bruyverne xerneas yveltal zygarde diancie hoopa volcanion brindibou effleche '
    + 'archeduc flamiaou matoufeu felinferno otaquin otarlette oratoria picassaut piclairon '
    + 'bazoucan manglouton argouste larvibule chrysapile lucanon crabagarre crabominable '
    + 'plumeline bombydou rubombelle rocabot lougaroc froussardine vorasterie predasterie '
    + 'tiboudet bourrinos araqua tarenbulle mimantis floramantis spododo lampignon tritox '
    + 'malamandre nounourson chelours croquine candine sucreine guerilande gouroutan quartermac '
    + 'sovkipou sarmurai bacabouh trepassable concombaffe type-0 silvallie meteno-rouge dodoala '
    + 'boumata togedemaru mimiqui denticrisse draieul sinistrail bebecaille ecaid ekaiser '
    + 'tokorico tokopiyon tokotoro tokopisco cosmog cosmovum solgaleo lunala zeroid mouscoto '
    + 'cancrelove cablifere bamboiselle katagami engloutyran necrozma magearna marshadow vemini '
    + 'mandrillon ama-ama pierroteknik zeraora meltan melmetal ouistempo badabouin gorythmic '
    + 'flambino lapyro pyrobut larmeleon arrozard lezargus rongourmand rongrigou minisange '
    + 'bleuseille corvaillus larvadar coleodome astronelle goupilou roublenard tournicoton '
    + 'blancoton moumouton moumouflon khelocrok torgamord voltoutou fulgudog charbi wagomine '
    + 'monthracite verpom pomdrapi dratatin dunaja dunaconda nigosier embrochet hastacuda toxizap '
    + 'salarsen grillepattes scolocendre poulpaf krakos theffroi-authentique polthegeist bibichut '
    + 'chapotus sorcilence grimalin fourbelin angoliath ixon berserkatt corayome palarticho '
    + 'm-glaquette tutetekri cremy charmilly hexadron wattapik frissonille beldeneige dolman '
    + 'bekaglacon wimessir morpeko charibari pachyradjah galvagon galvagla hydragon hydragla '
    + 'duralugon fantyrm dispareptil lanssorien zacian zamazenta ethernatos wushours shifours '
    + 'zarude regieleki regidrago blizzeval spectreval sylveroy cerbyllin hachecateur ursaking '
    + 'paragruel farfurex qwilpik amovenus poussacha matourgeon miascarade chochodile crocogril '
    + 'flamigator coiffeton canarbello palmaval gourmelet fragroin tissenboule filentrappe '
    + 'lilliterelle gambex pohm pohmotte pohmarmotte compagnol famignol patachiot briochien '
    + 'olivini olivado arboliva tapatoes selutin amassel gigansel charbambin carmadura malvalame '
    + 'tetampoule ampibidou zapetrel fulgulairo grondogue dogrino gribouraigne tag-tag virovent '
    + 'virevorreur terracool terracruel craparoi pimito scovilain leboulerou berasca flotillon '
    + 'cleopsytra forgerette forgella forgelina taupikeau triopikeau lestombaile dofin superdofin '
    + 'vrombi vrombotor motorizard ferdeter germeclat floreclat toutombe tomberro flamenroule '
    + 'pietace balbaleze delestin oyacata nigirigon courrousinge terraiste farigiraf deusolourdo '
    + 'scalpereur fort-ivoire hurle-queue fongus-furie flotte-meche rampe-ailes pelage-sable '
    + 'roue-de-fer hotte-de-fer paume-de-fer tetes-de-fer mite-de-fer epine-de-fer frigodo cryodo '
    + 'glaivodo mordudor gromago chongjian baojian dinglu yuyu rugit-lune garde-de-fer koraidon '
    + 'miraidon serpente-eau vert-de-fer pomdramour poltchageist theffroyable felicanis '
    + 'fortusimia favianos ogerpon pondralugon pomdorochi feu-percant ire-foudre roc-de-fer '
    + 'chef-de-fer terapagos pechaminus',

  // --- 2. Formes régionales : Alola, Galar, Hisui, Paldea -------------------
  regionale:
    'rattata-a rattatac-a raichu-a sabelette-a sablaireau-a goupix-a feunard-a taupiqueur-a '
    + 'triopikeur-a miaouss-a miaouss-g persian-a caninos-hisui arcanin-hisui racaillou-a '
    + 'gravalanch-a grolem-a ponyta-g galopa-g ramoloss-g flagadoss-g canarticho-g tadmorv-a '
    + 'grotadmorv-a voltorbe-hisui electrode-hisui noadkoko-a ossatueur-a smogogo-g mmime-g '
    + 'tauros-p tauros-p1 tauros-p2 artikodin-g electhor-g sulfura-g typhlosion-hisui axoloto-p '
    + 'roigada-g qwilfish-hisui farfuret-hisui corayon-g zigzaton-g lineon-g clamiral-hisui '
    + 'fragilady-hisui darumarond-g darumacho-g tutafeh-g zorua-hisui zoroark-hisui limonde-g '
    + 'gueriaigle-hisui colimucus-hisui muplodocus-hisui seracrawl-hisui archeduc-hisui',

  // --- 3. Formes alternatives ----------------------------------------------
  // Casquettes de Pikachu, lettres de Zarbi, motifs de Prismillon, parfums de
  // Charmilly, noyaux de Météno… Tout ce qui n'est ni régional ni sexué.
  alt:
    'pikachu-casquette-originale pikachu-casquette-hoenn pikachu-casquette-sinnoh '
    + 'pikachu-casquette-unys pikachu-casquette-kalos pikachu-casquette-alola '
    + 'pikachu-casquette-partenaire pikachu-casquette-monde zarbi-b zarbi-c zarbi-d zarbi-e '
    + 'zarbi-g zarbi-h zarbi-i zarbi-j zarbi-k zarbi-l zarbi-m zarbi-n zarbi-o zarbi-p zarbi-q '
    + 'zarbi-r zarbi-s zarbi-t zarbi-u zarbi-v zarbi-w zarbi-x zarbi-y zarbi-z zarbi-exclamation '
    + 'zarbi-interrogation deoxys-attaque deoxys-defense deoxys-vitesse cheniti-sol cheniti-acier '
    + 'cheniselle-sol cheniselle-acier sancoki-mer-orient tritosor-mer-orient motisma-chaleur '
    + 'motisma-lavage motisma-froid motisma-helice motisma-tonte shaymin-celeste bargantua-bleu '
    + 'bargantua-blanc vivaldaim-forme-ete vivaldaim-forme-automne vivaldaim-forme-hiver '
    + 'haydaim-forme-ete haydaim-forme-automne haydaim-forme-hiver boreas-totemique '
    + 'fulguris-totemique demeteros-totemique keldeo-decide prismillon-motif-banquise '
    + 'prismillon-motif-glace prismillon-motif-continent prismillon-motif-verdure '
    + 'prismillon-motif-monarchie prismillon-motif-blizzard prismillon-motif-metropole '
    + 'prismillon-motif-rivage prismillon-motif-archipel prismillon-motif-secheresse '
    + 'prismillon-motif-sable prismillon-motif-delta prismillon-motif-cyclone '
    + 'prismillon-motif-mangrove prismillon-motif-zenith prismillon-motif-soleil-levant '
    + 'prismillon-motif-jungle prismillon-motif-fantaisie prismillon-motif-poke-ball '
    + 'flabebe-fleur-jaune flabebe-fleur-orange flabebe-fleur-bleue flabebe-fleur-blanche '
    + 'floette-fleur-jaune floette-fleur-orange floette-fleur-bleue floette-fleur-blanche '
    + 'floette-fleur-eternelle florges-fleur-jaune florges-fleur-orange florges-fleur-bleue '
    + 'florges-fleur-blanche couafarel-coupe-coeur couafarel-coupe-etoile couafarel-coupe-diamant '
    + 'couafarel-coupe-demoiselle couafarel-coupe-madame couafarel-coupe-monsieur '
    + 'couafarel-coupe-reine couafarel-coupe-kabuki couafarel-coupe-pharaon pitrouille-mini '
    + 'pitrouille-maxi pitrouille-ultra banshitrouye-mini banshitrouye-maxi banshitrouye-ultra '
    + 'zygarde-10 hoopa-dechaine plumeline-pompom plumeline-hula plumeline-buyo '
    + 'lougaroc-nocturne lougaroc-crepusculaire meteno-orange meteno-jaune meteno-vert '
    + 'meteno-bleu meteno-indigo meteno-violet magearna-couleur-passe salarsen-forme-grave '
    + 'polthegeist-authentique charmilly-lait-vanille-baie charmilly-lait-vanille-coeur '
    + 'charmilly-lait-vanille-etoile charmilly-lait-vanille-trefle charmilly-lait-vanille-fleur '
    + 'charmilly-lait-vanille-ruban charmilly-lait-ruby-fraise charmilly-lait-ruby-baie '
    + 'charmilly-lait-ruby-coeur charmilly-lait-ruby-etoile charmilly-lait-ruby-trefle '
    + 'charmilly-lait-ruby-fleur charmilly-lait-ruby-ruban charmilly-lait-matcha-fraise '
    + 'charmilly-lait-matcha-baie charmilly-lait-matcha-coeur charmilly-lait-matcha-etoile '
    + 'charmilly-lait-matcha-trefle charmilly-lait-matcha-fleur charmilly-lait-matcha-ruban '
    + 'charmilly-lait-menthe-fraise charmilly-lait-menthe-baie charmilly-lait-menthe-coeur '
    + 'charmilly-lait-menthe-etoile charmilly-lait-menthe-trefle charmilly-lait-menthe-fleur '
    + 'charmilly-lait-menthe-ruban charmilly-lait-citron-fraise charmilly-lait-citron-baie '
    + 'charmilly-lait-citron-coeur charmilly-lait-citron-etoile charmilly-lait-citron-trefle '
    + 'charmilly-lait-citron-fleur charmilly-lait-citron-ruban charmilly-lait-sale-fraise '
    + 'charmilly-lait-sale-baie charmilly-lait-sale-coeur charmilly-lait-sale-etoile '
    + 'charmilly-lait-sale-trefle charmilly-lait-sale-fleur charmilly-lait-sale-ruban '
    + 'charmilly-melange-ruby-fraise charmilly-melange-ruby-baie charmilly-melange-ruby-coeur '
    + 'charmilly-melange-ruby-etoile charmilly-melange-ruby-trefle charmilly-melange-ruby-fleur '
    + 'charmilly-melange-ruby-ruban charmilly-melange-caramel-fraise '
    + 'charmilly-melange-caramel-baie charmilly-melange-caramel-coeur '
    + 'charmilly-melange-caramel-etoile charmilly-melange-caramel-trefle '
    + 'charmilly-melange-caramel-fleur charmilly-melange-caramel-ruban '
    + 'charmilly-melange-tricolore-fraise charmilly-melange-tricolore-baie '
    + 'charmilly-melange-tricolore-coeur charmilly-melange-tricolore-etoile '
    + 'charmilly-melange-tricolore-trefle charmilly-melange-tricolore-fleur '
    + 'charmilly-melange-tricolore-ruban shifours-mille-poings zarude-papa '
    + 'ursaking-lune-vermeille amovenus-totemique famignol-quatre tapatoes-bleu tapatoes-jaune '
    + 'tapatoes-blanc nigirigon-affalee nigirigon-raide deusolourdo-triple mordudor-marche',

  // --- 4. Femelles visuellement distinctes ---------------------------------
  genre:
    'florizarre-f papilusion-f rattata-f rattatac-f pikachu-f raichu-f nosferapti-f '
    + 'nosferalto-f ortide-f rafflesia-f kadabra-f alakazam-f doduo-f dodrio-f hypnomade-f '
    + 'rhinocorne-f rhinoferos-f poissirene-f poissoroy-f insecateur-f magicarpe-f leviator-f '
    + 'evoli-f meganium-f coxy-f coxyclaque-f xatu-f simularbre-f tarpaud-f capumain-f axoloto-f '
    + 'maraiste-f cornebre-f zarbi-f qulbutoke-f girafarig-f scorplane-f steelix-f cizayox-f '
    + 'scarhino-f farfuret-f farfuret-hisui-f ursaring-f cochignon-f octillery-f demolosse-f '
    + 'donphan-f poussifeu-f galifeu-f brasegali-f charmillon-f papinox-f ludicolo-f pifeuil-f '
    + 'tengalice-f meditikka-f charmina-f roselia-f gloupti-f avaltout-f chamallot-f camerupt-f '
    + 'cacturne-f milobellus-f relicanth-f etourmi-f etourvol-f etouraptor-f keunotor-f '
    + 'castorno-f crikzik-f melokrik-f lixy-f luxio-f luxray-f roserade-f apitrini-f pachirisu-f '
    + 'mustebouee-f musteflott-f capidextre-f griknot-f carmache-f carchacrok-f hippopotas-f '
    + 'hippodocus-f cradopaud-f coatox-f ecayon-f lumineon-f blizzi-f blizzaroi-f dimoret-f '
    + 'rhinastoc-f bouldeneu-f mammochon-f deflaisan-f viskuse-f moyade-f nemelios-f mistigrix-f '
    + 'wimessir-f paragruel-f fragroin-f',
};

/** Les identifiants d'un niveau, en tableau. */
function homeNiveau(nom){
  return (HOME_NIVEAUX[nom] || '').split(' ').filter(Boolean);
}

/**
 * Le nombre d'entrées déposables, cumulé jusqu'au niveau demandé (1 à 4).
 *
 * 1 → 1025   une par espèce
 * 2 → 1082   + les 57 formes régionales
 * 3 → 1280   + les 198 formes alternatives
 * 4 → 1384   + les 104 femelles distinctes
 */
function homeTotal(niveau){
  const ordre = ['base', 'regionale', 'alt', 'genre'];
  let n = 0;
  for(let i = 0; i < Math.min(niveau, 4); i++) n += homeNiveau(ordre[i]).length;
  return n;
}
