# Capa de servidor

Cada fitxer executable d'aquesta carpeta ha de començar amb `import "server-only"`.

Les pàgines coordinen serveis; els serveis autoritzen i executen regles de negoci; els repositoris encapsulen persistència. Les integracions concretes s'afegiran quan tinguin un ús real. Els mòduls de `features` són independents de React i dels proveïdors.

Abans d'afegir una mutació: validar entrada estricta, verificar identitat i permisos al servidor, protegir origen/CSRF, aplicar límits distribuïts i comprovar idempotència quan correspongui. El proxy només configura capçaleres: no autentica ni autoritza.

No hi ha encara clients Supabase, claus privilegiades, endpoints de compra ni autenticació. No exposar rutes de compte o administració fins que existeixin aquests controls i proves.
