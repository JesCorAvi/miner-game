# Higiene de contexto y documentación

## Qué se carga y cuándo

| Elemento | Cuándo se carga | Coste |
|---|---|---|
| `CLAUDE.md` | Inicio de sesión de Claude Code | Siempre |
| `name` + `description` de cada skill | Inicio de sesión | Siempre |
| `SKILL.md` | Al invocar la skill | Bajo demanda |
| `references/*.md` | Cuando el agente las lee | Bajo demanda |
| `plan.md`, `README.md` | Cuando el agente los lee | Bajo demanda |
| Código | Cuando el agente lo lee | Bajo demanda |
| `dist/`, `release/`, `node_modules/`, lockfiles | Bloqueado por `.claude/settings.json` | Cero |

Consecuencia: **el detalle debe vivir en referencias, no en `CLAUDE.md`**. Un párrafo movido de `CLAUDE.md` a una referencia deja de costar tokens en cada sesión.

## Matriz de propiedad

### README.md

- Público: usuario y colaborador nuevo.
- Contenido: qué es, características, controles, instalación, multijugador, estructura resumida.
- No dupliques aquí invariantes internas ni procedimientos de agente.

### plan.md

- Público: mantenedor y agente que planifica.
- Contenido: estado de entrega, decisiones, deuda técnica, roadmap, comprobaciones realizadas.
- Es la fuente de verdad del **estado** y las **decisiones**, no de los procedimientos.
- Si una sección crece demasiado, divide por hitos o mueve el contrato técnico a una skill.

### CLAUDE.md

- Público: Claude Code, cargado siempre.
- Contenido: mapa de módulos, comandos, invariantes que no se pueden romper, tabla de skills, enlaces.
- Formato: frases cortas, tablas pequeñas, rutas concretas.
- No incluyas: tutoriales, tablas de balance completas, DTOs, fórmulas largas, historial.
- Presupuesto: ≤400 líneas; aviso a 450.

### AGENTS.md

- Público: Antigravity y otros agentes.
- Contenido: reglas globales, comandos de validación, invariantes, tabla de skills.
- No es una copia de `CLAUDE.md`: si una regla cambia, actualiza ambas o enlaza.
- Presupuesto: ≤120 líneas; aviso a 250.

### SKILL.md

- Público: agente que ya decidió invocar la skill.
- Contenido: cuándo usarla, flujo obligatorio, tabla de fuentes, reglas no negociables, validación, salida esperada.
- Formato: operativo; nada de motivación extensa.
- Presupuesto: ≤140 líneas; aviso a 160.
- Una skill debe justificarse si tiene: dominio recurrente, invariantes propias y auditoría mecánica. Si falta uno, probablemente sea una sección de otra skill.

### references/*.md

- Público: agente que necesita el contrato completo.
- Contenido: DTOs, tablas, fórmulas, casos límite, checklists.
- Presupuesto: ≤200 líneas; aviso a 240.
- Cada referencia debe estar enlazada desde su `SKILL.md`; la auditoría lo comprueba.

### Comentarios de código

- Solo para el **por qué** no obvio: una restricción, un orden crítico, una decisión deliberada.
- No repitas lo que el código ya dice.
- No dejes comentarios obsoletos; son peor que no tenerlos.

## Política de duplicación

Permitido:

- Una invariante crítica en `CLAUDE.md` **y** en la skill del dominio, si el agente puede llegar por dos caminos.
- Un ejemplo mínimo en una skill y su desarrollo en la referencia.

No permitido:

- La misma tabla de cuotas en `plan.md`, `CLAUDE.md` y dos referencias.
- El mismo procedimiento paso a paso en `AGENTS.md` y `CLAUDE.md`.
- Copiar un DTO completo en la skill y en la referencia.

Regla práctica: **una fuente, muchos enlaces**. Si necesitas repetir, repite una frase de invariante, no un bloque de 20 líneas.

## Cómo escribir una skill compacta

1. `description`: una frase, con disparadores concretos (“al tocar X, Y, Z”).
2. `Overview`: 1–2 párrafos; qué garantiza la skill.
3. `When to Use` / `When Not to Use`: listas cortas; evita solapamientos.
4. `Mandatory Workflow`: 5–8 pasos; cada paso con una acción verificable.
5. `Source Table`: archivo → export/método; es el índice que evita leer todo.
6. `Non-Negotiable Rules`: solo lo que rompe el juego si se ignora.
7. `Validation Ladder`: niveles 0–4; di qué se puede probar y qué no.
8. `References`: 1–2 como máximo.
9. `Related Skills`: enlaces, no repetición.

## Cómo leer con menos tokens

- `rg -n "símbolo" src` antes de abrir un archivo.
- `Read` con `offset`/`limit` alrededor del símbolo; no el archivo entero.
- `git diff --stat` para ver el alcance de un cambio.
- `wc -l` para decidir si merece la pena abrir un archivo.
- Las auditorías sustituyen la lectura de invariantes: si la auditoría pasa, no hace falta releer todo el contrato.
- Para un flujo, sigue el orden: entrada (UI/Input) → Game → sistema → salida (UI/red).

## Checklist antes de añadir una skill

- [ ] ¿Existe ya una skill que cubra el 80%?
- [ ] ¿Tiene invariantes propias que no caben en una referencia?
- [ ] ¿Puede tener una auditoría mecánica?
- [ ] ¿Su `description` es una sola frase con disparadores?
- [ ] ¿Su `SKILL.md` cabe en 140 líneas?
- [ ] ¿Se ha añadido a `CLAUDE.md` y `AGENTS.md`?
- [ ] ¿Se ha ejecutado `sync-agent-skills.mjs`?

## Checklist antes de añadir una sección a CLAUDE.md

- [ ] ¿Es una invariante que debe estar siempre presente?
- [ ] ¿Puede vivir en la skill del dominio y enlazarse?
- [ ] ¿Añade más de 10 líneas? Si sí, probablemente sea una referencia.
- [ ] ¿Duplica una tabla existente?
- [ ] ¿El documento sigue por debajo de 400 líneas?
