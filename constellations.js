// ═══════════════════════════════════════════════════════════════════════════
// THE CONSTELLATION FIGURES — the eighty-eight constellations.
//
// GENERATED FILE — do not edit by hand.
//   node tools/build-starcat.mjs /path/to/hygdata_v41.csv /path/to/modern-index.json
//
// The Modern sky culture, as transcribed by the Stellarium team: the
// constellations the International Astronomical Union defined in 1922,
// and the lines that draw them.
//
//   Modern constellation lines © the Stellarium team, licensed
//   CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/
//   from https://github.com/Stellarium/stellarium (skycultures/modern).
//   The star catalogue they are joined to is HYG v4.1 © David Nash /
//   Astronexus. Both derivatives carry the same licence.
//
// Each line is a run of INDICES INTO THE STAR CATALOGUE, not names and
// not Hipparcos numbers: the join happened when the catalogue was built,
// so the sky carries one identifier per star and not two.
//
// A line is present only if every star on it is in the catalogue. The
// catalogue stops at magnitude 6 — the naked-eye limit — and some
// figures reach for stars fainter than the eye. Those lines are left
// out rather than drawn to a star that is not there.
// ═══════════════════════════════════════════════════════════════════════════

/** The eighty-eight figures: id, name, and the lines that draw them. */
export const CONSTELLATIONS = [{"id":"Aql","name":"Aquila","lines":[[365,11,116],[11,247,452],[218,452],[247,170,528],[247,268]]},
  {"id":"And","name":"Andromeda","lines":[[53,224,54],[60,54,440,940]]},
  {"id":"Scl","name":"Sculptor","lines":[[794,710,821,794]]},
  {"id":"Ara","name":"Ara","lines":[[341,141,195,392,325,233,140,341]]},
  {"id":"Lib","name":"Libra","lines":[[595,470,101,123,221,470]]},
  {"id":"Cet","name":"Cetus","lines":[[775,711],[278,50,305],[50,271,320,375,1392,1320,658,1171,278]]},
  {"id":"Ari","name":"Aries","lines":[[326,48,103,454]]},
  {"id":"Sct","name":"Scutum","lines":[[640,2484,1772,1096,439,640]]},
  {"id":"Pyx","name":"Pyxis","lines":[[501,348,526]]},
  {"id":"Boo","name":"Boötes","lines":[[400,2,80,273,281,182,311,2,108,545]]},
  {"id":"Cae","name":"Caelum","lines":[[1733,844,1677]]},
  {"id":"Cha","name":"Chamaeleon","lines":[[542,581,659]]},
  {"id":"Cnc","name":"Cancer","lines":[[532,1078,1867],[1078,486,296],[486,679]]},
  {"id":"Cap","name":"Capricornus","lines":[[314,184,568,698,356,144],[698,394,568],[184,596],[568,591]]},
  {"id":"Car","name":"Carina","lines":[[27,228,119,989,480,399,410,252,65],[723,38,1],[266,65],[266,723],[1,201],[38,64]]},
  {"id":"Cas","name":"Cassiopeia","lines":[[243,107,62,70,73]]},
  {"id":"Cen","name":"Centaurus","lines":[[258,52],[275,78,197],[94,63,468,98,1030,191]]},
  {"id":"Cep","name":"Cepheus","lines":[[254,286,216,88,254],[286,212,216]]},
  {"id":"Com","name":"Coma Berenices","lines":[[735,648,767]]},
  {"id":"Aur","name":"Auriga","lines":[[105,40,5,353,110],[26,110],[26,105]]},
  {"id":"Col","name":"Columba","lines":[[433,786,780,193,491],[193,104,442]]},
  {"id":"Cir","name":"Circinus","lines":[[206,890],[206,558]]},
  {"id":"Crt","name":"Crater","lines":[[566,867,551,307,566],[307,1292,1125,1963,1141,551]]},
  {"id":"CrA","name":"Corona Australis","lines":[[1831,2430,1333,653,584,576,985,1182,2398],[1831,1950]]},
  {"id":"CrB","name":"Corona Borealis","lines":[[603,343,66,411,1003,604,1570]]},
  {"id":"Crv","name":"Corvus","lines":[[720,162,99,179,527],[179,106,162]]},
  {"id":"Cru","name":"Crux","lines":[[23,12],[18,128]]},
  {"id":"Cyg","name":"Cygnus","lines":[[407,384,146,69,19],[69,90,211,903],[69,462,183]]},
  {"id":"Dor","name":"Dorado","lines":[[749,1066,380,749],[380,230,677]]},
  {"id":"Nor","name":"Norma","lines":[[1521,523,869,1072,523],[1072,1521]]},
  {"id":"Eri","name":"Eridanus","lines":[[8,352,306,657,1172,577,150,675,713,614,300,498,409,635,676,357,563,871,458,1264,366,289,478,518,778,125,668,441]]},
  {"id":"Sge","name":"Sagitta","lines":[[806,349,805],[349,287,1796]]},
  {"id":"For","name":"Fornax","lines":[[852,404]]},
  {"id":"Gem","name":"Gemini","lines":[[42,519,285,313,245],[285,550,309],[550,16],[550,397,814,22],[814,321],[814,185,594],[185,147,232,610]]},
  {"id":"Cam","name":"Camelopardalis","lines":[[629,1515,678],[629,997,678],[997,1759]]},
  {"id":"CMa","name":"Canis Major","lines":[[564,578,781,0,178,36,520,87],[21,279,36],[489,46],[489,0],[21,284],[177,21],[781,564]]},
  {"id":"UMa","name":"Ursa Major","lines":[[37,68,32,236,35,79,84,236],[84,355,172,269],[172,186],[79,964,202,310],[202,194],[964,398,246,339,35]]},
  {"id":"Gru","name":"Grus","lines":[[700,505,29,57,457,700],[57,585],[57,283],[29,884,175]]},
  {"id":"Her","name":"Hercules","lines":[[417,445,608,1057,200,277,626,471,1013],[277,132,126,376],[132,472,816,196],[264,358,428],[472,200],[264,816]]},
  {"id":"Hor","name":"Horologium","lines":[[431,2052,1840]]},
  {"id":"Hya","name":"Hydra","lines":[[716,855,601,249,766,716],[766,189,460,950,1000,47,1218,1742,580,328,418,190,1461,297,704,1506,168,220,1746,1243,828]]},
  {"id":"Hyi","name":"Hydrus","lines":[[133,223,586,561,145]]},
  {"id":"Ind","name":"Indus","lines":[[807,192,346,807]]},
  {"id":"Lac","name":"Lacerta","lines":[[606,939,760,970,831,385,760]]},
  {"id":"Mon","name":"Monoceros","lines":[[510,607],[382,607,1217,799,875,1075],[607,1118,782],[1118,484]]},
  {"id":"Lep","name":"Lepus","lines":[[1092,361,301,97,227],[97,381,317,131,208],[97,131],[227,702],[227,779],[208,227],[779,853],[702,2252]]},
  {"id":"Leo","name":"Leo","lines":[[61,241,20,276,49,95,61],[49,267,455,166],[95,241]]},
  {"id":"Lup","name":"Lupus","lines":[[503,3653,263,503],[263,130,213,312],[213,109],[130,755,259,77],[259,547],[77,741],[77,109]]},
  {"id":"Lyn","name":"Lynx","lines":[[198,414,974,492,669,1019,764,845]]},
  {"id":"Lyr","name":"Lyra","lines":[[4,757,292,222,642,757]]},
  {"id":"Ant","name":"Antlia","lines":[[695,2101]]},
  {"id":"Mic","name":"Microscopium","lines":[[1145,1099,1422]]},
  {"id":"Mus","name":"Musca","lines":[[181,336,427,112,181]]},
  {"id":"Oct","name":"Octans","lines":[[373,597,724,373]]},
  {"id":"Aps","name":"Apus","lines":[[420,444,652]]},
  {"id":"Oph","name":"Ophiuchus","lines":[[58,124],[85,124],[58,209,214,93,85,1244]]},
  {"id":"Ori","name":"Orion","lines":[[30,28,72],[1517,854],[1517,1052,798],[854,822,798],[854,588,9,30,55,6,72,25,251,9],[25,207,347,2336,360,873],[207,762,1051],[822,588]]},
  {"id":"Pav","name":"Pavo","lines":[[44,633,265,304,44],[304,504,524,811,304],[811,641,770,743,641],[743,330]]},
  {"id":"Peg","name":"Pegasus","lines":[[136,91],[86,160,3132],[86,288,506,395,605],[91,627,261,294,81],[53,86],[53,136],[86,91]]},
  {"id":"Pic","name":"Pictor","lines":[[217,908,432]]},
  {"id":"Per","name":"Perseus","lines":[[422,139,507,155,176,33,158,386],[33,59,235,634]]},
  {"id":"Equ","name":"Equuleus","lines":[[1130,883,1951,474,1130]]},
  {"id":"CMi","name":"Canis Minor","lines":[[7,152]]},
  {"id":"LMi","name":"Leo Minor","lines":[[403,625,899,951],[899,403]]},
  {"id":"Vul","name":"Vulpecula","lines":[[850,1087]]},
  {"id":"UMi","name":"Ursa Minor","lines":[[45,769,631,705,1522,173,56,705]]},
  {"id":"Phe","name":"Phoenix","lines":[[483,234,475,483],[234,476,795,234,256,475,83,453,475]]},
  {"id":"Psc","name":"Pisces","lines":[[2807,1088],[2807,1170,1088,331,674,413,1017,851,1334,683,4557,2458,536,598,1527,904,1526,359,1708,692,598]]},
  {"id":"PsA","name":"Piscis Austrinus","lines":[[17,620,2615,1654,1512,708,628]]},
  {"id":"Vol","name":"Volans","lines":[[765,500],[765,390,514,765]]},
  {"id":"Pup","name":"Puppis","lines":[[137,2318,114,201,161,219,64,137]]},
  {"id":"Ret","name":"Reticulum","lines":[[240,843,972,421,240]]},
  {"id":"Sgr","name":"Sagittarius","lines":[[115,135],[188,34,167,945],[167,115,34,100,204,115],[204,135,429],[100,239,51,204],[51,293,383,1403,473],[239,3342,837,790,590,495],[590,690]]},
  {"id":"Sco","name":"Scorpius","lines":[[24,82,169,39,237,1127,174,76,134,15,75],[15,154],[15,96]]},
  {"id":"Ser","name":"Serpens","lines":[[117,298,363,102,406,340,437,571,340],[1036,2043,215,4198,238,662,299,738]]},
  {"id":"Sex","name":"Sextans","lines":[[1766,889]]},
  {"id":"Men","name":"Mensa","lines":[[1982,2916]]},
  {"id":"Tau","name":"Taurus","lines":[[26,687,295],[13,165],[338,388],[338,257,327],[13,295],[13,255,338],[295,714,388,332]]},
  {"id":"Tel","name":"Telescopium","lines":[[575,282]]},
  {"id":"Tuc","name":"Tucana","lines":[[149,513,646],[513,773]]},
  {"id":"Tri","name":"Triangulum","lines":[[530,171,262,530]]},
  {"id":"TrA","name":"Triangulum Australe","lines":[[41,148,138,41]]},
  {"id":"Aqr","name":"Aquarius","lines":[[157,163,446,342,540,374,663,497],[163,615,707],[615,1315,548,226,350],[401,157]]},
  {"id":"Vir","name":"Virgo","lines":[[538,461,120,14,616,556,450],[14,250,650,371],[250,253,143],[253,120]]},
  {"id":"Vel","name":"Vela","lines":[[31,322,43,89,291,111,426,434,323,67,31]]}];
