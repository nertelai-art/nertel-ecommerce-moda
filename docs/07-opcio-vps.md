# Opció de VPS per gestionar diversos projectes

Estat: proposta d'arquitectura. No s'ha contractat ni configurat cap servidor.

## Recomanació

Una VPS pot ser adequada per a projectes propis, eines internes i entorns de proves si assumim la seva operació. Per a la primera botiga comercial d'un client, prioritzem Supabase gestionat i propietat del negoci fins a disposar d'un procés provat de manteniment i recuperació.

El nombre de BD per si sol no determina l'estalvi. Cal comparar servidor, disc, còpies externes, correu, transferència, monitoratge i hores de manteniment amb el servei gestionat. Mesurar RAM, CPU, disc i concurrència abans d'escollir la mida de la VPS.

## Organització proposada

- Una pila Docker Compose per projecte que necessiti Supabase, amb xarxa, volums, claus i credencials diferents.
- Una BD/rol separat per projecte si només necessita PostgreSQL; no afegir tots els serveis Supabase sense necessitat.
- Un reverse proxy HTTPS per a les API que hagin de ser públiques; PostgreSQL i Studio accessibles per VPN o túnel SSH.
- Límits de recursos per reduir l'impacte d'un projecte sobre els altres.
- Còpies xifrades fora de la VPS, tant de PostgreSQL com dels fitxers Storage, amb proves de restauració per projecte.
- Actualitzacions versionades, alertes i registre dels desplegaments. Claus fora de Git i de les imatges Docker.

Compartir VPS implica compartir servidor, nucli i capacitat: els contenidors no equivalen a màquines independents. Una caiguda o compromís del host pot afectar tots els clients. Separar projectes més crítics quan la disponibilitat o l'aïllament ho exigeixin.

## Diferències amb el servei gestionat

Supabase autogestionat és una instància d'un sol projecte: Studio no ofereix el selector d'organitzacions i projectes del servei allotjat. Per separar diversos projectes desplegarem instàncies diferents i en gestionarem l'inventari. El manteniment, les còpies i la recuperació són responsabilitat nostra. [Documentació oficial](https://supabase.com/docs/guides/self-hosting).

No traslladar la pila de la CLI local tal qual a Internet. Per al servidor s'utilitza la distribució oficial de self-hosting amb Docker Compose, versions fixades i secrets nous. Les migracions SQL del repositori continuen sent útils, però cal verificar permisos, extensions i configuració a la destinació. [Desplegament amb Docker](https://supabase.com/docs/guides/self-hosting/docker).

## Quan decidir

Abans de contractar: inventari de projectes, propietaris, serveis necessaris, consum observat, pressupost, disponibilitat requerida i qui respon a incidències. Una VPS inicial pot agrupar proves; la producció de clients es decideix per criticitat i cost total, no per evitar el límit gratuït.
