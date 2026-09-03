# Direcció visual inicial

Estat: proposta per desenvolupar i validar visualment. No és una identitat definitiva ni un disseny ja implementat.

## Context

El propietari encara no té nom ni logotip. Ha indicat [Polín et moi](https://polinetmoi.com/) com a referència d'estil. S'ha revisat la portada en navegador: fotografia de campanya de gran format, entorn natural, títols serif, navegació discreta i accent verd apagat. La pàgina també organitza la descoberta per col·leccions i productes.

Aquesta referència orienta la sensació visual; no confirma que la nostra botiga tingui les mateixes categories, públic, tarifes o polítiques comercials. No reutilitzarem el seu logotip, fotografies ni textos.

## Proposta pròpia

Sensació: elegant, natural, càlida i tranquil·la. Les peces i la fotografia tenen el protagonisme. Identificador provisional: «Botiga de moda», centralitzat quan es construeixi la configuració de marca, per poder substituir-lo sense recórrer tots els components.

### Colors proposats

| Ús                 | Color inicial                   |
| ------------------ | ------------------------------- |
| Fons general       | Ivori `#FAF8F4`                 |
| Superfícies        | Blanc `#FFFFFF`                 |
| Text principal     | Carbó càlid `#292723`           |
| Text secundari     | Gris càlid `#625D55`            |
| Accent decoratiu   | Sàlvia `#84958A`                |
| Botó principal     | Verd fosc `#354D40`, text blanc |
| Línies decoratives | Sorra `#DED7CD`                 |

Són tokens de proposta, no valors extrets de la marca de referència. El sàlvia clar i les línies suaus no s'utilitzaran com a únic indicador de controls o estats. Validar contrast de text, vores interactives i focus abans d'aplicar-los; objectiu WCAG 2.2 AA.

### Tipografia i composició

- Títols editorials amb serif; text, preus i formularis amb sans serif llegible. Màxim dues famílies; fonts amb llicència adequada i allotjades localment.
- Text de lectura de 16 px com a base, interlineat ampli i preus fàcils de trobar. Evitar majúscules en textos llargs.
- Espaiat coherent a partir de 4, 8, 12, 16, 24, 32, 48 i 64 px.
- Botons simples, radis petits i controls tàctils d'almenys 44 × 44 px.
- Fotografies de producte verticals 3:4; fotografies de campanya amb retall específic per a mòbil. No inventar imatges de peces disponibles per comprar.
- Efectes discrets i respecte de moviment reduït. Primera portada amb imatge estàtica; evitar un carrusel automàtic com a requisit inicial.

## Estructura de pantalles

1. **Inici:** capçalera amb marca, menú, cerca i carret; imatge editorial amb una acció; col·leccions; novetats; informació de servei validada i peu de pàgina.
2. **Catàleg:** graella de dues columnes en mòbil i quatre en pantalles amples, adaptant-la al contingut; filtres accessibles, ordenació i estat buit. Cap compra ràpida que ometi una talla o un color obligatori.
3. **Producte:** galeria, nom, preu, selectors explícits, disponibilitat, acció d'afegir i condicions d'enviament/devolució abans de comprar.
4. **Carret:** variants, quantitats, imports i canvis d'estoc clars; compra com a convidat visible quan estigui implementada.
5. **Administració:** sistema visual coherent però orientat a lectura i operacions: taules, filtres, estats i confirmacions clares.

Les categories definitives dependran del catàleg real. Favorits, newsletter, blog i avisos comercials no són necessaris per reproduir aquesta sensació visual. No mostrar enllaços o botons sense una acció implementada en la botiga funcional.

## Normes d'implementació

- Separar tokens visuals, components compartits i contingut comercial. No duplicar paletes a cada pàgina.
- Cada component interactiu ha de tenir estats de focus, desactivat, càrrega i error quan correspongui.
- Menú i filtres mòbils accessibles amb teclat; diàlegs amb focus gestionat i retorn al control d'origen.
- Evitar text sobre imatges si no se'n pot assegurar el contrast en tots els retalls; utilitzar un bloc de text separat o una capa adequada.
- No publicar promeses d'enviament, descomptes o devolucions sense confirmació del negoci.
- Validar la proposta amb una portada i una fitxa de producte abans d'estendre-la a tota la botiga.

## Decisions obertes

Nom, logotip, catàleg i públic concret, llengües comercials, fotografies pròpies, selecció final de fonts i validació de la paleta. No bloquegen un primer prototip identificat com a demostració; sí que condicionen la identitat final.
