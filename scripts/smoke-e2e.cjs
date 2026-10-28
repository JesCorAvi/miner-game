'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

async function runE2E() {
  await app.whenReady();

  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      webgl: true,
    },
  });

  const distHtml = path.resolve(__dirname, '..', 'dist', 'index.html');
  await win.loadFile(distHtml);

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const game = window.__carbonMagnateGame;
      if (!game) throw new Error('Instancia Game no encontrada en window.__carbonMagnateGame');

      const logs = [];
      logs.push('[E2E] 1. Menú inicial detectado: fase=' + game.phase);
      if (game.phase !== 'menu') throw new Error('Se esperaba fase "menu", se obtuvo ' + game.phase);

      // Abrir la configuración de expedición y elegir Escopetero.
      const startBtn = document.getElementById('start-new');
      if (!startBtn) throw new Error('No se encontró el botón de nueva expedición');
      startBtn.click();
      await wait(80);

      const setup = document.getElementById('expedition-setup-overlay');
      if (!setup || setup.hidden) {
        throw new Error('La configuración de expedición no se abrió');
      }
      if (document.querySelectorAll('.setup-class-card').length !== 15) {
        throw new Error('La configuración no muestra las 15 clases');
      }
      document.getElementById('setup-cancel')?.click();
      await wait(60);
      if (game.phase !== 'menu' || !setup.hidden) {
        throw new Error('Cancelar la configuración no devolvió al menú');
      }
      startBtn.click();
      await wait(80);
      const shotgunnerCard = document.getElementById('setup-class-shotgunner');
      if (!shotgunnerCard) throw new Error('No se encontró la tarjeta del Escopetero');
      shotgunnerCard.click();
      const arsenalText = document.getElementById('setup-arsenal')?.textContent || '';
      if (!arsenalText.includes('ESCOPETA')) {
        throw new Error('El arsenal del Escopetero no muestra la escopeta');
      }
      if (arsenalText.includes('PISTOLA')) {
        throw new Error('El arsenal del Escopetero muestra armas no comprables');
      }
      const setupConfirm = document.getElementById('setup-confirm');
      if (!setupConfirm) throw new Error('No se encontró el botón de iniciar expedición');
      setupConfirm.click();
      await wait(400);
      if (!setup.hidden) throw new Error('La configuración no se cerró al iniciar');

      if (!game.run.loadout.weapons.shotgun || game.run.loadout.weaponTiers.shotgun !== 1) {
        throw new Error('El kit inicial del Escopetero no entregó la escopeta T1');
      }
      if (game.run.loadout.weapons.pickaxe || game.run.loadout.pickaxeTier !== 0) {
        throw new Error('El Escopetero no debe empezar con pico además de su escopeta');
      }
      if (!(game.tools.rigs instanceof Map) || game.tools.rigs.size !== 22) {
        throw new Error('No se construyeron los 22 modelos de arma');
      }
      logs.push('[E2E] 2. Partida iniciada: fase=' + game.phase + ', día=' + game.run.day + ', clase=' + game.run.loadout.profession + ', modelos=' + game.tools.rigs.size);
      if (game.phase !== 'playing' || game.run.day !== 1) {
        throw new Error('Fallo al iniciar Día 1, fase=' + game.phase + ' día=' + game.run.day);
      }

      // 3. Excavar terreno
      const initialSolids = game.terrain.getSolidCount();
      game.terrain.carve({ x: 0, y: -10, z: 0, r: 2.0, s: 1.0, shape: 'sphere' });
      const postCarveSolids = game.terrain.getSolidCount();
      logs.push('[E2E] 3. Excavación realizada: sólidos=' + initialSolids + ' -> ' + postCarveSolids);
      if (postCarveSolids >= initialSolids) throw new Error('El carve de terreno no redujo los sólidos');

      // 3.5 Probar familias con comportamientos únicos
      game.run.loadout.profession = 'generalist';
      game.run.loadout.weapons.tank = true;
      game.run.loadout.weaponTiers.tank = 1;
      game.syncEquipmentInventory();
      game.activeWeapon = 'tank';
      game.tools.setActive('tank', false);
      game.tryUseWeapon();
      if (game.projectiles.length === 0) {
        throw new Error('La familia de proyectil no generó un proyectil');
      }
      await wait(250);
      game.run.loadout.weapons.battleaxe = true;
      game.run.loadout.weaponTiers.battleaxe = 1;
      game.run.loadout.weapons.earthquake = true;
      game.run.loadout.weaponTiers.earthquake = 1;
      game.syncEquipmentInventory();
      game.activeWeapon = 'battleaxe';
      game.tools.setActive('battleaxe', false);
      game.tryUseWeapon();
      game.activeWeapon = 'earthquake';
      game.tools.setActive('earthquake', false);
      game.tryUseWeapon();
      game.clearProjectiles();
      game.run.loadout.weapons.magicStaff = true;
      game.run.loadout.weaponTiers.magicStaff = 1;
      game.syncEquipmentInventory();
      game.activeWeapon = 'magicStaff';
      game.tools.setActive('magicStaff', false);
      game.tryUseWeapon();
      if (game.projectiles.length < 2) {
        throw new Error('El bastón mágico no lanzó su salva de misiles');
      }
      game.clearProjectiles();
      const allWeapons = [
        'pickaxe', 'tesla', 'drill', 'shotgun', 'pistol', 'rifle', 'minigun',
        'axe', 'battleaxe', 'boxingGlove', 'roundhouseKick', 'magicStaff', 'orb',
        'jet', 'tank', 'flamethrower', 'poisonGun', 'poisonStaff', 'waterGun',
        'waterStaff', 'mortar', 'earthquake',
      ];
      for (const weapon of allWeapons) {
        game.run.loadout.weapons[weapon] = true;
        game.run.loadout.weaponTiers[weapon] = 1;
      }
      game.syncEquipmentInventory();
      for (const weapon of allWeapons) {
        game.cooldowns[weapon] = 0;
        game.activeWeapon = weapon;
        game.tools.setActive(weapon, false);
        game.tryUseWeapon();
        game.updatePendingPickaxeStrike(1);
      }
      game.clearProjectiles();
      logs.push('[E2E] 3.6 Las 22 familias ejecutaron su comportamiento sin errores');

      // 4. Recoger mineral y carbón en inventario
      game.inventory.addMineral('coal', 15, 0, 1.2);
      game.inventory.addMineral('iron', 0, 120, 0.8);
      logs.push('[E2E] 4. Minerales en mochila: total piezas=' + game.inventory.totals().count);

      // 5. Volver a la tolva y depositar con E
      game.player.position.set(14, 0.2, 28.5);
      game.depositCargo();
      logs.push('[E2E] 5. Depósito en tolva completado: carbón=' + game.run.carbon + ', capital=' + game.run.money);
      if (game.run.carbon <= 0) throw new Error('El depósito no acreditó carbón');

      // 6. Liquidación de turno (Acta de extracción)
      game.run.carbon = Math.max(game.run.carbon, game.run.quota); // Asegurar cuota
      game.finishDay();
      await wait(300);
      logs.push('[E2E] 6. Liquidación completada: fase=' + game.phase);
      if (game.phase !== 'shop') throw new Error('Se esperaba fase "shop", se obtuvo ' + game.phase);

      const summaryOverlay = document.getElementById('day-summary-overlay');
      if (!summaryOverlay || summaryOverlay.hidden) {
        throw new Error('El overlay de liquidación (Acta de extracción) no se mostró');
      }

      // 7. Continuar a la oficina nocturna
      document.getElementById('day-summary-continue')?.click();
      await wait(200);

      // Iniciar Día 2
      document.getElementById('shop-next')?.click() || game.startNextDay();
      await wait(400);
      logs.push('[E2E] 7. Día 2 iniciado con éxito: día=' + game.run.day + ', fase=' + game.phase);
      if (game.run.day !== 2 || game.phase !== 'playing') {
        throw new Error('Fallo al iniciar el Día 2');
      }

      // 8. Prueba de Soak de 10 días consecutivos midiendo memoria
      logs.push('[E2E] 8. Iniciando prueba de remojo (10 transiciones de día)...');
      const memoryLogs = [];

      for (let d = 2; d <= 11; d++) {
        game.run.carbon = game.run.quota; // Cubrir cuota
        game.finishDay();
        game.startNextDay();

        const geometries = game.renderer.info.memory.geometries;
        const textures = game.renderer.info.memory.textures;
        memoryLogs.push({ day: d, geometries, textures });
      }

      const initialGeoms = memoryLogs[0].geometries;
      const finalGeoms = memoryLogs[memoryLogs.length - 1].geometries;
      logs.push('[E2E] Soak completado: geometrías día 2=' + initialGeoms + ', día 11=' + finalGeoms);

      // Comprobar 0 fugas de memoria (las geometrías no crecen descontroladamente)
      if (finalGeoms > initialGeoms + 15) {
        throw new Error('Fuga de memoria detectada: geometrías pasaron de ' + initialGeoms + ' a ' + finalGeoms);
      }

      return { success: true, logs, memoryLogs };
    })()
  `);

  console.log('\n--- REPORTE E2E SMOKE & SOAK (10 DÍAS) ---');
  for (const log of result.logs) {
    console.log(log);
  }
  console.log('\nMétricas de memoria por día:', result.memoryLogs);
  console.log('\n✅ SMOKE E2E & HARNESS DE RENDIMIENTO / MEMORIA COMPLETADO CON ÉXITO\n');

  app.quit();
  process.exit(0);
}

runE2E().catch((err) => {
  console.error('❌ ERROR EN PRUEBA E2E:', err);
  app.quit();
  process.exit(1);
});
