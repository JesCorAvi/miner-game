# Instancing, presupuestos y liberación de VRAM

## Presupuestos actuales

| Sistema | Estructura | Límite |
|---|---|---|
| Pepitas | `InstancedMesh` en `LootField` | `MAX_PELLETS = 6000` |
| Nodos | Un `InstancedMesh` por tipo de mineral/cofre | Nodos generados por día |
| Tolva | `InstancedMesh` de chunks | 72 |
| Escombros | `InstancedMesh` en `Effects` | `MAX_DEBRIS` |
| Chispas | `Points` con atributos reciclados | Pool de `Effects` |
| Escaleras | `Mesh` con geometría/material compartidos | `MAX_LADDERS = 80` |

## Pepitas

- `LootField` crea un único `InstancedMesh` de `MAX_PELLETS`.
- Cada pepita tiene slot, estado, física local y color de instancia.
- `spawnFromNode()` reutiliza slots libres (`findSlot`) y escribe matrices/colores.
- `update()` integra gravedad/colisiones y aplica el imán; no crea objetos por frame.
- `dispose()` libera mesh, geometría y material.

## Nodos

- `Resources.generate()` agrupa nodos por `meshType` y crea un `InstancedMesh` por tipo.
- `setInstanceMatrix()` actualiza la instancia; `markBroken()` mueve la instancia a `y = -999` y escala 0.
- El glow es un `Points` separado con textura radial.
- `clear()` dispone mallas, materiales y geometrías; `dispose()` además libera glow y textura.

## Tolva

- `Hopper` crea la estructura, el montón (`Mesh`) y 72 chunks instanciados. El montón y los chunks se limitan al cono interior y el desborde se dibuja en el borde del rim, no por debajo de la tolva.
- `update(dt, carbon, quota)` ajusta altura, radio, color y cantidad visible; no reconstruye geometría.
- `dispose()` recorre el grupo, libera mapas/materiales/geometrías y la textura del cartel.

## Efectos

- Pools de chispas, escombros, arcos, ondas, haces y polvo.
- `InstancedMesh` o `Points` con buffers preasignados.
- `spawnHit`, `spawnNodeBreak`, `spawnMuzzle`, `spawnExplosion`, etc. reutilizan slots.
- `dispose()` libera todas las geometrías/materiales y la textura de polvo.

## Escaleras

- `Ladders` comparte dos geometrías fusionadas (vertical y horizontal), un material y un material fantasma.
- Cada instancia colocada es un `Mesh` con la geometría compartida; no la dispongas por instancia. Los meshes fantasma son dos y se reutilizan.
- `clear()` retira los meshes; `dispose()` libera ambas geometrías y los materiales compartidos.

## Escenario y avatares

- `Environment.dispose()` recorre meshes/points, libera geometrías/materiales y texturas, y llama a `SkyCycle.dispose()` para su domo de shader, estrellas, textura de estrella y luces. `Landscape` comparte geometrías/materiales entre instancias; no los liberes por instancia.
- `Avatars.disposeRig()` libera etiqueta, sprite y materiales/geometrías hijos.
- Las etiquetas de nombre son texturas canvas por avatar; liberarlas al eliminar el avatar.

## Game.dispose()

Debe llamar, como mínimo, a:

```ts
this.input.dispose();
this.audio.dispose();
this.ui.dispose();
this.tools.dispose?.(...);
this.remoteAvatars.clear();
this.staffAvatars.clear();
this.staffManager.clear();
this.effects.dispose();
this.resources.dispose();
this.loot.dispose();
this.hopper.dispose();
this.ladders.dispose();
this.terrain.dispose();
this.environment.dispose();
this.grenadeGeometry.dispose();
this.grenadeMaterial.dispose();
this.renderer.dispose();
```

Si añades un sistema con geometría, materiales o texturas, añádelo también a `Game.dispose()`.

## Comprobar fugas

1. Abrir la consola y anotar `renderer.info.memory.geometries` y `.textures`.
2. Iniciar/abandonar días varias veces.
3. Volver al menú y repetir.
4. Los contadores no deben crecer de forma sostenida.
5. Si crecen, revisar `clear()`/`dispose()` del sistema afectado.

## Errores típicos

- Crear `BufferGeometry`/`Material` dentro de `update()`.
- Compartir geometría y liberarla por instancia.
- Olvidar `texture.dispose()` en una textura canvas.
- No retirar el grupo de la escena (`removeFromParent()`).
- Duplicar materiales por instancia en lugar de compartirlos.
- Añadir un `Mesh` por pepita/nodo en lugar de usar instancing.
