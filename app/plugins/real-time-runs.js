const fs = require('fs-extra');
const csv = require('fast-csv');
const path = require('path');
const dateFormat = require('dateformat');

module.exports = {
  defaultConfig: {
    enabled: false,
    logWipes: false,
  },
  defaultConfigDetails: {
    logWipes: { label: 'Log Wipes' },
  },
  // plugin meta data to better describe your plugin
  pluginName: 'RealTimeRuns',
  pluginDescription: 'This plugin shows your runs data in real time.',
  init(proxy, config) {
    // Subscribe to api command events from the proxy here.
    // You can subscribe to specifc API commands. Event name is the same as the command string
    proxy.on('BattleDungeonStart', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        // proxy.log({ type: 'info', source: 'plugin', name: this.pluginName, message: 'You just logged into the game.' });
        // this.log(proxy, req, resp);`
      }
    });

    proxy.on('BattleDungeonResult', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        // proxy.log({ type: 'info', source: 'plugin', name: this.pluginName, message: 'You just logged into the game.' });
        this.log(proxy, req, resp);
      }
    });

    this.getAllFiles(config, proxy);
    // or all API commands with the 'apiCommand' event
    // proxy.on('apiCommand', (req, resp) => {
    //   if (config.Config.Plugins[this.pluginName].enabled) {
    //     this.log(proxy, req, resp);
    //   }
    // });
  },
  async getAllFiles(config, proxy) {
    try {
      let files = await fs.readdir(config.Config.App.filesPath);

      files = files.filter(file => path.extname(file) === '.csv');

      console.log('-----------------------------');
      console.log(files);
      console.log('-----------------------------');

      proxy.filesToRead({ type: 'success', source: 'plugin', name: this.pluginName, content: files, message: `${files.length} data files found` });
    } catch (error) {
      console.log(error);
    }

    // fs.ensureFile(path.join(config.Config.App.filesPath, filename), (err) => {
    //   if (err) { return; }
    //   csv.fromPath(path.join(config.Config.App.filesPath, filename), { ignoreEmpty: true, headers, renameHeaders: true }).on('data', (data) => {
    //     csvData.push(data);
    //   }).on('end', () => {
    //     csvData.push(entry);
    //     csv.writeToPath(path.join(config.Config.App.filesPath, filename), csvData, { headers }).on('finish', () => {
    //       proxy.log({ type: 'success', source: 'plugin', name: self.pluginName, message: `Saved run data to ${filename}` });
    //     });
    //   });
    // });
  },

  getItem(crate) {
    if (crate.random_scroll && crate.random_scroll.item_master_id === 1) {
      return `Unknown Scroll x${crate.random_scroll.item_quantity}`;
    }
    if (crate.random_scroll && crate.random_scroll.item_master_id === 8) {
      return `Summoning Stones x${crate.random_scroll.item_quantity}`;
    }
    if (crate.random_scroll && crate.random_scroll.item_master_id === 2) {
      return 'Mystical Scroll';
    }
    if (crate.costume_point) {
      return `Shapeshifting Stone x${crate.costume_point}`;
    }
    if (crate.rune_upgrade_stone) {
      return `Power Stone x${crate.rune_upgrade_stone.item_quantity}`;
    }
    if (crate.unit_info) {
      return `${gMapping.getMonsterName(crate.unit_info.unit_master_id)} ${crate.unit_info.class}`;
    }
    if (crate.material) {
      const id = crate.material.item_master_id.toString();
      const attribute = Number(id.slice(-1));
      const grade = Number(id.slice(1, -3));
      return `Essence of ${gMapping.essence.attribute[attribute]}(${gMapping.essence.grade[grade]}) x${crate.material.item_quantity}`;
    }
    if (crate.craft_stuff && gMapping.craftMaterial[crate.craft_stuff.item_master_id]) {
      return `${gMapping.craftMaterial[crate.craft_stuff.item_master_id]} x${crate.craft_stuff.item_quantity}`;
    }
    if (crate.summon_pieces) {
      return `Summoning Piece ${gMapping.getMonsterName(crate.summon_pieces.item_master_id)} x${crate.summon_pieces.item_quantity}`;
    }

    return 'Unknown Drop';
  },

  getItemRift(item, entry) {
    if (item.type === 8) {
      const rune = item.info;
      entry.drop = 'Rune';
      entry.grade = `${rune.class}*`;
      entry.sell_value = rune.sell_value;
      entry.set = gMapping.rune.sets[rune.set_id];
      entry.slot = rune.slot_no;
      entry.efficiency = gMapping.getRuneEfficiency(rune).current;
      entry.rarity = gMapping.rune.class[rune.sec_eff.length];
      entry.main_stat = gMapping.getRuneEffect(rune.pri_eff);
      entry.prefix_stat = gMapping.getRuneEffect(rune.prefix_eff);

      rune.sec_eff.forEach((substat, i) => {
        entry[`sub${i + 1}`] = gMapping.getRuneEffect(substat);
      });
    }
    if (item.info.craft_type_id) {
      enhancement = this.getEnchantVals(item.info.craft_type_id, item.info.craft_type);
      entry.drop = enhancement.drop;
      entry.sell_value = item.sell_value;
      entry.set = enhancement.set;
      entry.main_stat = enhancement.type;
      entry.sub1 = enhancement.min;
      entry.sub2 = enhancement.max;
    }
    return entry;
  },

  log(proxy, req, resp) {
    const { command } = req;
    const { wizard_id: wizardID, wizard_name: wizardName } = resp.wizard_info;

    const entry = {};

    if (command === 'BattleDungeonResult') {
      if (gMapping.dungeon[req.dungeon_id]) {
        entry.dungeon = `${gMapping.dungeon[req.dungeon_id]} B${req.stage_id}`;
      } else {
        entry.dungeon = req.dungeon_id > 10000 ? 'Hall of Heroes' : 'Unknown';
      }
    }

    if (command === 'BattleScenarioResult') {
      entry.dungeon = this.temp[wizardID].stage ? this.temp[wizardID].stage : 'Unknown';
    }

    const winLost = resp.win_lose === 1 ? 'Win' : 'Lost';
    if (winLost === 'Lost' && !config.Config.Plugins[this.pluginName].logWipes) { return; }

    entry.date = dateFormat(new Date(), 'yyyy-mm-dd HH:MM');
    entry.result = winLost;

    const reward = resp.reward ? resp.reward : {};
    entry.mana = reward.mana ? reward.mana : 0;
    entry.energy = reward.energy ? reward.energy : 0;
    entry.crystal = reward.crystal ? reward.crystal : 0;

    if (req.clear_time) {
      const seconds = Math.floor((req.clear_time / 1000) % 60) < 10 ? `0${Math.floor((req.clear_time / 1000) % 60)}` : Math.floor((req.clear_time / 1000) % 60);
      const time = [Math.floor(req.clear_time / 1000 / 60), seconds];
      entry.time = `${time[0]}:${time[1]}`;
    }

    if (reward.crate) {
      entry.mana = reward.crate.mana ? entry.mana + reward.crate.mana : entry.mana;
      entry.energy = reward.crate.energy ? entry.energy + reward.crate.energy : entry.energy;
      entry.crystal = reward.crate.crystal ? entry.crystal + reward.crate.crystal : entry.crystal;

      if (reward.crate.rune) {
        const rune = reward.crate.rune;
        entry.drop = 'Rune';
        entry.grade = `${rune.class}*`;
        entry.sell_value = rune.sell_value;
        entry.set = gMapping.rune.sets[rune.set_id];
        entry.slot = rune.slot_no;
        entry.efficiency = gMapping.getRuneEfficiency(rune).current;
        entry.rarity = gMapping.rune.class[rune.sec_eff.length];
        entry.main_stat = gMapping.getRuneEffect(rune.pri_eff);
        entry.prefix_stat = gMapping.getRuneEffect(rune.prefix_eff);

        rune.sec_eff.forEach((substat, i) => {
          entry[`sub${i + 1}`] = gMapping.getRuneEffect(substat);
        });
      } else {
        entry.drop = this.getItem(reward.crate);
      }
    }

    if (resp.unit_list && resp.unit_list.length > 0) {
      resp.unit_list.forEach((unit, i) => {
        entry[`team${i + 1}`] = gMapping.getMonsterName(unit.unit_master_id);
      });
    }

    if (resp.instance_info) {
      entry.drop = 'Secret Dungeon';
    }

    // const headers = ['date', 'dungeon', 'result', 'time', 'mana', 'crystal', 'energy', 'drop', 'grade', 'sell_value', 'set', 'efficiency', 'slot', 'rarity', 'main_stat', 'prefix_stat', 'sub1', 'sub2', 'sub3', 'sub4', 'team1', 'team2', 'team3', 'team4', 'team5'];

    proxy.rtLog(Object.assign(
      entry,
      {
        log: {
          type: 'success',
          source: 'plugin',
          name: this.pluginName,
          message: 'Run data saved for Real Time Visualization'
        }
      }
    ));
    // proxy.rtLog({ type: 'success', source: 'plugin', name: this.pluginName, content: entry, message: 'Run data saved for Real Time Visualization' });

    // const filename = sanitize(`${wizardName}-${wizardID}-runs.csv`);
    // this.saveToFile(entry, filename, headers, proxy);
  },

  log_raid_rift(proxy, req, resp) {
    const { wizard_id: wizardID, wizard_name: wizardName } = resp.wizard_info;

    let entry = {};
    if (gMapping.dungeon[req.dungeon_id]) {
      entry.dungeon = `${gMapping.elemental_rift_dungeon[req.dungeon_id]}`;
      isElemental = true;
    }

    const winLost = resp.win_lose === 1 ? 'Win' : 'Did not kill';

    entry.date = dateFormat(new Date(), 'yyyy-mm-dd HH:MM');
    entry.result = winLost;

    const reward = resp.reward ? resp.reward : {};

    if (resp.win_lose === 1) {
      if (!reward.crate) {
        entry.drop = `${resp.battle_reward_list.find(value => value.wizard_id === resp.wizard_info.wizard_id).reward_list[0].item_quantity} Mana`;
      } else if (reward.crate.runecraft_info) {
        const item = {
          info: {
            craft_type: reward.crate.runecraft_info.craft_type,
            craft_type_id: reward.crate.runecraft_info.craft_type_id
          }
        };
        entry = this.getItemRift(item, entry);
      } else if (reward.crate.rune) {
        entry = this.getItemRift(reward.crate.rune, entry);
      } else if (reward.crate.unit_info && reward.crate.unit_info.unit_master_id > 0) {
        entry.drop = `${gMapping.getMonsterName(reward.crate.unit_info.unit_master_id)} ${reward.crate.unit_info.class}`;
      } else if (!entry.drop && resp.reward.crate) {
        entry.drop = this.getItem(reward.crate);
      } else {
        entry.drop = 'unknown';
      }
    } else {
      entry.drop = 'none';
    }

    if (resp.unit_list && resp.unit_list.length > 0) {
      resp.unit_list.forEach((unit, i) => {
        entry[`team${i + 1}`] = gMapping.getMonsterName(unit.unit_master_id);
      });
    }
    const headers = ['date', 'dungeon', 'result', 'time', 'item1', 'item2', 'item3', 'drop', 'grade', 'sell_value', 'set', 'efficiency', 'slot', 'rarity', 'main_stat', 'prefix_stat', 'sub1', 'sub2', 'sub3', 'sub4', 'team1', 'team2', 'team3', 'team4', 'team5', 'team6'];

    // const filename = sanitize(`${wizardName}-${wizardID}-raid-runs.csv`);
    // this.saveToFile(entry, filename, headers, proxy);
  },

  log_elemental_rift(proxy, req, resp) {
    const { wizard_id: wizardID, wizard_name: wizardName } = resp.wizard_info;

    let entry = {};
    if (gMapping.dungeon[req.dungeon_id]) {
      entry.dungeon = `${gMapping.elemental_rift_dungeon[req.dungeon_id]}`;
      isElemental = true;
    }

    const winLost = req.battle_result === 1 ? 'Win' : 'Did not kill';

    entry.date = dateFormat(new Date(), 'yyyy-mm-dd HH:MM');
    entry.result = winLost;


    if (resp.item_list && resp.item_list.length > 0) {
      resp.item_list.forEach((item, i) => {
        if (item.is_boxing !== 1 || item.id === 2001) {
          entry[`item${i + 1}`] = `${gMapping.craftMaterial[item.id]} x${item.quantity}`;
        } else {
          if (item.id === 2) {
            entry.drop = 'Mystical Scroll';
          }
          if (item.id === 8) {
            entry.drop = `Summoning Stones x${item.item_quantity}`;
          }
          if (item.info && item.info.unit_master_id > 0) {
            entry.drop = `${gMapping.getMonsterName(item.info.unit_master_id)} ${item.class}`;
          }
          if ((item.info && item.info.craft_type_id) || item.type === 8) {
            entry = this.getItemRift(item, entry);
          }
        }
      });
    }

    if (resp.unit_list && resp.unit_list.length > 0) {
      resp.unit_list.forEach((unit, i) => {
        entry[`team${i + 1}`] = gMapping.getMonsterName(unit.unit_master_id);
      });
    }
    const headers = ['date', 'dungeon', 'result', 'time', 'item1', 'item2', 'item3', 'drop', 'grade', 'sell_value', 'set', 'efficiency', 'slot', 'rarity', 'main_stat', 'prefix_stat', 'sub1', 'sub2', 'sub3', 'sub4', 'team1', 'team2', 'team3', 'team4', 'team5', 'team6'];

    // const filename = sanitize(`${wizardName}-${wizardID}-raid-runs.csv`);
    // this.saveToFile(entry, filename, headers, proxy);
  },

  getEnchantVals(craftID, craftType) {
    const map = {};
    const typeNumber = Number(craftID.toString().slice(-4, -2));
    map.set = gMapping.rune.sets[Number(craftID.toString().slice(0, -4))];
    map.grade = gMapping.rune.quality[Number(craftID.toString().slice(-1))];
    map.type = gMapping.rune.effectTypes[typeNumber];

    if (craftType === 2) {
      map.min = gMapping.grindstone[typeNumber].range[Number(craftID.toString().slice(-1))].min;
      map.max = gMapping.grindstone[typeNumber].range[Number(craftID.toString().slice(-1))].max;
      map.drop = 'Grindstone';
    } else {
      map.min = gMapping.enchanted_gem[typeNumber].range[Number(craftID.toString().slice(-1))].min;
      map.max = gMapping.enchanted_gem[typeNumber].range[Number(craftID.toString().slice(-1))].max;
      map.drop = 'Enchanted Gem';
    }
    return map;
  },
};
