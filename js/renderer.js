const { ipcRenderer, ipcMain } = require('electron')

var tab1 = document.getElementById('tab-btn-1')
var tab2 = document.getElementById('tab-btn-2')
// var tab3 = document.getElementById('tab-btn-3')
var tab4 = document.getElementById('tab-btn-4')
var tab5 = document.getElementById('tab-btn-5')

var content1 = document.getElementById('content-1');
var content2 = document.getElementById('content-2');
var content3 = document.getElementById('content-3');
var content4 = document.getElementById('content-4');
var content5 = document.getElementById('content-5');
var installedModpacksWrapper = document.getElementById('installed-modpacks')

tab1.addEventListener('change', checkTabs)
tab2.addEventListener('change', checkTabs)
// tab3.addEventListener('change', checkTabs)
tab4.addEventListener('change', checkTabs)
tab5.addEventListener('change', checkTabs)

let versionsList = []
var pathById = new Map();
var installedModpacks = [];

let launching = 0;

class Modpack
{
    constructor(modpackName, modpackVersion, modpackMods, modpackDirectory, modpackForgeVersion) {
        this.name = modpackName;
        this.version = modpackVersion;
        this.mods = modpackMods;
        this.directory = modpackDirectory;
        this.forgeVersion = modpackForgeVersion;
    }

    // this method initializes similar class in index.js
    async backendClassInit() {
        return await ipcRenderer.invoke('init-modpack', this.name, this.version,
            this.mods, this.directory, this.forgeVersion);
    }

    // this method calls backend class to add parameters to modpacks.json
    async addModpackJSON() {
        await this.backendClassInit();  // calling class initializer

        return await ipcRenderer.invoke('add-modpack');
    }

    async downloadModpack() {
        return ipcRenderer.invoke('download-modpack');
    }

    async removeModpack() {
        return await ipcRenderer.invoke('remove-modpack');
    }

    async startModpack(username, server) {
        return await ipcRenderer.invoke('start-modpack', username, server);
    }
}

class CreatedModpack
{
    constructor() {
        this.mods = [];

        this.table = document.getElementById('modpack-table');

        (async () => {
            this.downloadedModpacks = (await ipcRenderer.invoke('check-modpacks')).modpacks;
        })();
    }

    addMod(mod) {
        if(!this.mods.includes(mod)) {
            this.mods.push(mod);
        }
    }

    deleteMod(mod) {
        let modIndex = this.mods.indexOf(mod);
        if (modIndex !== -1) {
            this.mods.splice(modIndex, 1);
        }
    }

    setName(modpackName) {
        this.name = modpackName;
    }

    setDirectory(modpackDirectory) {
        this.directory = modpackDirectory;
    }

    setVersion(modpackVersion) {
        this.version = modpackVersion;
    }

    setForgeVersion(modpackForgeVersion) {
        this.forgeVersion = modpackForgeVersion;
    }

    async prepareMods() {
        let modsForBackend = [];
        for (let mod in this.mods) {
            let modDownloads = this.mods[mod].downloads;
            for (let modFile in modDownloads) {
                if(modDownloads[modFile].minecraft === this.version) {
                    modsForBackend.push(modDownloads[modFile]);
                }
            }
        }

        this.mods = modsForBackend;
        return modsForBackend;
    }

    async addModpack() {
        await this.prepareMods();

        this.modpack = new Modpack(this.name, this.version, this.mods, this.directory, this.forgeVersion);
        this.modpack.addModpackJSON();
        return this.modpack.downloadModpack();
    }
}

function checkModsForModpack(createdModpack, installedMods)
{
    return new Promise((resolve) => {
        console.log(installedMods);

        let modTable = document.getElementById('mod-tablee');
        let modTableRows = modTable.children;
        let forgeSelect = document.getElementById('mod-versions-selectt');

        for(let row in modTableRows)
        {
            let modTableRow = modTableRows[row];
            modTableRow.innerHTML = '';
        }
        $.getJSON('https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/mods-list.json', function(modsJSON)  // fayching mods list
        {
            let mods = modsJSON.mods;
            for (let mod in mods)
            {
                modFiles = mods[mod]['downloads'];
                for(let file in modFiles)
                {
                    url = modFiles[file]['url'];
                    let selectedForgeVersion = forgeSelect.value;
                    
                    if(modFiles[file]['minecraft'] == selectedForgeVersion)
                    {
                        for(let row in modTableRows)
                        {
                            let modTableRow = modTableRows[row];

                            if(row != 'length' && row != 'item' && row != 'namedItem')
                            {
                                let rowCells = modTableRows[row].children;
                                if(rowCells.length < 4)
                                {
                                    /* this is so shitcody lol
                                    i have no idea how to make this better */

                                    let modCell = document.createElement('div');
                                    modCell.className = 'content-cell';
                                    modCell.innerHTML =`
                                    <img class="content-img" src="${mods[mod]['image-url']}">
                                    <p class="content-name">${mods[mod]['name']}</p>
                                    <p class="content-text">${mods[mod]['description-ru']}</p>
                                    `;

                                    let downloadModButton = document.createElement('div');
                                    downloadModButton.className = 'mod-button';

                                    let modInstalled = false;

                                    console.log(mods[mod]);

                                    if(typeof installedMods != "undefined") {
                                        for(fileInstalled of installedMods) {
                                            for(fileDisplay of mods[mod]["downloads"]) {
                                                if(fileInstalled["filename"] == fileDisplay["filename"]) {
                                                    modInstalled = true;

                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    if(modInstalled == false) {
                                        downloadModButton.innerHTML = `<p class="install-text" style="color: white">Добавить</p>`;
                                        downloadModButton.style.backgroundColor = 'darkgreen';

                                        modCell.appendChild(downloadModButton);
                                        modTableRow.appendChild(modCell);
                                    } else {
                                        downloadModButton.innerHTML = `<p class="install-text" style="color: red">Исключить</p>`;
                                        downloadModButton.style.backgroundColor = 'white';

                                        modCell.appendChild(downloadModButton);
                                        modTableRow.appendChild(modCell);
                                    }

                                    downloadModButton.addEventListener('click', () => {
                                       
                                        if(modInstalled === false) {
                                            createdModpack.addMod(mods[mod]);
                                            downloadModButton.innerHTML = `<p class="install-text" style="color: red">Исключить</p>`;
                                            downloadModButton.style.backgroundColor = 'white';
                                            modInstalled = true;
                                        } else {
                                            createdModpack.deleteMod(mods[mod]);
                                            downloadModButton.innerHTML = `<p class="install-text" style="color: white">Добавить</p>`;
                                            downloadModButton.style.backgroundColor = 'darkgreen';
                                            modInstalled = false;
                                        }
                                        
                                    });

                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            }
        })

        let endModpackInstallation = document.getElementById('end-mods');
        endModpackInstallation.addEventListener('click', async () => {
            if (createdModpack.mods.length > 0)
            {
                document.getElementById('status').innerHTML = 'Установка сборки...';

                createdModpack.setVersion(forgeSelect.value);

                dialog1.style.display = 'block';
                dialog2.style.display = 'none';

                await createdModpack.addModpack();

                document.getElementById('status').innerHTML = 'Поздравляем, сборка установлена успешно! Теперь Вы всегда сможете увидеть её в списке сборок на этой вкладке!';

                console.log(createdModpack);

                resolve(createdModpack);
            } else {
                let chooseModsHeader = document.getElementById('dialog-2-text');

                chooseModsHeader.innerHTML = 'Вы не выбрали ни одного мода,<br>выберите хотя бы один мод из списка!'
            }
        });
    })
}

function checkTabs() {
    if(tab1.checked) {
        content1.style.display = 'block';
        content2.style.display = 'none';
        content3.style.display = 'none';
        content4.style.display = 'none';
        content5.style.display = 'none';
        installedModpacksWrapper.style.display = 'none';
    } else if (tab2.checked) {
        content1.style.display = 'none';
        content2.style.display = 'block';
        content3.style.display = 'none';
        content4.style.display = 'none';
        content5.style.display = 'none';
        installedModpacksWrapper.style.display = 'none';
    } else if (0 == 1) {
        content1.style.display = 'none';
        content2.style.display = 'none';
        content3.style.display = 'block';
        content4.style.display = 'none';
        content5.style.display = 'none';
        installedModpacksWrapper.style.display = 'none';
    } else if (tab4.checked) {
        content1.style.display = 'none';
        content2.style.display = 'none';
        content3.style.display = 'none';
        content4.style.display = 'block';
        content5.style.display = 'none';
        installedModpacksWrapper.style.display = 'none';
    } else if (tab5.checked && installedModpacks.length <= 0) {
        content1.style.display = 'none';
        content2.style.display = 'none';
        content3.style.display = 'none';
        content4.style.display = 'none';
        content5.style.display = 'block';
        installedModpacksWrapper.style.display = 'none';

    } else if(tab5.checked && installedModpacks.length > 0) {
        content1.style.display = 'none';
        content2.style.display = 'none';
        content3.style.display = 'none';
        content4.style.display = 'none';
        content5.style.display = 'none';
        installedModpacksWrapper.style.display = 'block';
    }
}

document.getElementById('close-button').addEventListener('click', () => {
    ipcRenderer.send('close')
    console.log(document.getElementById('close-button'))
})

let createModpackNameButton = document.getElementById('modpack-button');
let modpackNameInput = document.getElementById('modpack-input');
let modpackNameFillAlert = document.getElementById('fill-alert');

dialog1 = document.getElementById('dialog-1')
dialog2 = document.getElementById('dialog-2')

createModpackNameButton.addEventListener('click', createModpackButtonPressed);

function createModpackButtonPressed() {
    if(modpackNameInput.value != '') {
        dialog1.style.display = 'none';
        dialog2.style.display = 'block';

        createModpack();
    } else {
        modpackNameFillAlert.style.visibility = 'visible';
    }
}

modpackNameInput.addEventListener("keydown", (e) => {
    if(e.code == "Enter") {
        createModpackButtonPressed();
    }
})

function makeID(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }

    return result;
}

function createModpack() {
    let createModpackNameInput = document.getElementById('modpack-input');

    let createdModpack = new CreatedModpack();
    createdModpack.setName(createModpackNameInput.value);
    createdModpack.setDirectory('modpack-'+makeID(30));

    checkForges();
    checkModsForModpack(createdModpack);
}

async function checkVersions(list, modpacks) {
    $.getJSON('https://launchermeta.mojang.com/mc/game/version_manifest.json', function(versionsJSON) {
        $.getJSON('https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/forge-list.json', function(forgeJSON)
        {
            $.getJSON('https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/optifine-list.json', function(optifineJSON) {
                installedModpacks = modpacks.modpacks.reverse();  // pushing modpack into list

                versionsSelect = document.getElementById('versions-select')

                versionsSelect.innerHTML = ""

                versionsSelect.innerHTML += '<option value=\"'+versionsJSON.latest.release+'\">Последняя версия '+versionsJSON.latest.release+'</option>'

                versionsSelect.innerHTML += '<option value=\"'+versionsJSON.latest.snapshot+'\">Последний снапшот '+versionsJSON.latest.snapshot+'</option>'

                for(var key in versionsJSON.versions){
                    //console.log(modpacks)s

                    for(oversion in list)
                    {
                        if(list[oversion][2] == versionsJSON.versions[key].id)
                        {
                            if(list[oversion][0] != versionsJSON.versions[key].id && !list[oversion][0].includes("-OptiFine_")) {
                                console.log(`list[oversion][0]: ${list[oversion][0]}`);
                                console.log(`versionsJSON.versions[key].id: ${versionsJSON.versions[key].id}`);

                                // if(list[oversion][1] == versionsJSON.versions[key].id)
                                // {
                                //     var opt = document.createElement('option');
            
                                //     opt.style = "color:green;"
                                //     opt.value = "omark$"+list[oversion][1]+"$"+list[oversion][4]+"$"+list[oversion][5]+"$"+list[oversion][2];
                                //     opt.innerHTML = "Версия "+list[oversion][0];
                                //     versionsSelect.appendChild(opt);
            
                                //     list.splice(oversion, 1);
                                //     break;
                                // }
                                
                                var opt = document.createElement('option');
            
                                opt.style = "color:red;"
                                opt.value = "omark$"+list[oversion][1]+"$"+list[oversion][4]+"$"+list[oversion][5]+"$"+list[oversion][2];
                                opt.innerHTML = "Версия "+list[oversion][0];
                                versionsSelect.appendChild(opt);
            
                                list.splice(oversion, 1);
                                break;
                            }
                        }
                    }

                    for(let forge in forgeJSON.forges)
                    {
                        // console.log(forgeJSON.forges[forge].minecraft)
                        // console.log(versionsJSON.versions[key].id)
                        if(forgeJSON.forges[forge].minecraft == versionsJSON.versions[key].id)
                        {
                            // versionsSelect.innerHTML += `<option style=\"color:blue;\" value=\"forge`+versionsJSON.versions[key].id+'\">Forge '+versionsJSON.versions[key].id+'</option>'
                        
                            var opt = document.createElement('option');

                            opt.style = "color:blue;"
                            opt.value = "forge"+versionsJSON.versions[key].id;
                            opt.innerHTML = 'Forge '+versionsJSON.versions[key].id;
                            versionsSelect.appendChild(opt);

                            break;
                        }
                    }

                    for(let optifine of optifineJSON.optifines)
                    {
                        // console.log(forgeJSON.forges[forge].minecraft)
                        // console.log(versionsJSON.versions[key].id)
                        if(optifine.minecraftVersion == versionsJSON.versions[key].id)
                        {
                            // versionsSelect.innerHTML += `<option style=\"color:blue;\" value=\"forge`+versionsJSON.versions[key].id+'\">Forge '+versionsJSON.versions[key].id+'</option>'
                        
                            var opt = document.createElement('option');

                            opt.style = "color:green;"
                            opt.value = "optifine;"+optifine.minecraftVersion;
                            opt.innerHTML = 'OptiFine '+optifine.minecraftVersion;
                            versionsSelect.appendChild(opt);

                            break;
                        }
                    }

                    // versionsList.push(versionsJSON.versions[key].id)

                    if(versionsJSON.versions[key].id === '1.8.9')
                        selected = " selected"
                    else
                        selected = ""

                    if(versionsJSON.versions[key].type === 'release')
                        versionsSelect.innerHTML += `<option${selected} value=\"`+versionsJSON.versions[key].id+'\">Версия '+versionsJSON.versions[key].id+'</option>'
                    
                    if(versionsJSON.versions[key].type === 'snapshot')
                        versionsSelect.innerHTML += `<option${selected} value=\"`+versionsJSON.versions[key].id+'\">Снапшот '+versionsJSON.versions[key].id+'</option>'
                
                    if(versionsJSON.versions[key].type === 'old_beta')
                        versionsSelect.innerHTML += `<option${selected} value=\"`+versionsJSON.versions[key].id+'\">Бета '+versionsJSON.versions[key].id+'</option>'
                    
                    if(versionsJSON.versions[key].type === 'old_alpha')
                        versionsSelect.innerHTML += `<option${selected} value=\"`+versionsJSON.versions[key].id+'\">Альфа '+versionsJSON.versions[key].id+'</option>'
                
                    for(let modpack in modpacks.modpacks) {
                        //console.log(modpacks.modpacks[modpack])
                        if(modpacks.modpacks[modpack]["version"] == versionsJSON.versions[key].id) {
                            // versionsSelect.innerHTML += `<option style=\"color:yellow;\" value=\"modpack;`+versionsJSON.versions[key].id+';'+modpacks.modpacks[modpack]["directory"]+'\">Сборка '+modpacks.modpacks[modpack]["directory"]+'</option>'

                            var opt = document.createElement('option');

                            opt.style = "color:yellow;"
                            opt.value = "modpack;"+versionsJSON.versions[key].id+";"+modpacks.modpacks[modpack]["directory"]+";"+modpacks.modpacks[modpack]["forgeVersion"];
                            opt.innerHTML = "Сборка "+modpacks.modpacks[modpack]["name"];

                            versionsSelect.appendChild(opt);
                        }
                    }
                }

                checkInstalledModpacks();
                checkTabs();

                // let html = versionsSelect.innerHTML

                // let keys = pathById.keys()
                // console.log(keys)
                // for (let id of keys)
                // {
                //     console.log(id)
                //     console.log('111')
                //     console.log('111')
                //     console.log('111')
                //     console.log('111')
                // }
                // versionsSelect.innerHTML = '<option value=111>Снапшот 111</option>' + html
            });
        });
    }).fail(() => {
        for(oversion in list)
        {
            console.log(`list[oversion][0]: ${list[oversion][0]}`);
            
            var opt = document.createElement('option');

            opt.style = "color:red;"
            opt.value = "omark$"+list[oversion][1]+"$"+list[oversion][4]+"$"+list[oversion][5]+"$"+list[oversion][2];
            opt.innerHTML = "Версия "+list[oversion][0];
            versionsSelect.appendChild(opt);

            list.splice(oversion, 1);
        }
    });
}

deleteModsButton = document.getElementById('delete-mods-button')
deleteModsButton.addEventListener('click', () => {
    let forgeSelect = document.getElementById('mod-versions-select')
    ipcRenderer.send('delete-mods', forgeSelect.value)
})

versionsSelect = document.getElementById('versions-select')
playButton = document.getElementById('play-button')
usernameInput = document.getElementById('username-input')
playButton.addEventListener('click', function() {
    rememberNickname();
    startGame();
})

function rememberNickname() {
    return ipcRenderer.invoke("remember-nickname", usernameInput.value);
}

function addServers(count) {
    //document.getElementById('content-1').innerHTML += '<div class="server-container"> <p class="server-text">Описание сервера</p> <div onclick=serv1() class="play-server"> <p class="server-play-text">Зайти на сервер</p> </div> </div>'
    
    $.getJSON('https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/server-list.json', function(serversJSON) {
        for(server in serversJSON.servers) {
            document.getElementById('content-1').innerHTML += `<div class="server-container"> <p class="server-text">${serversJSON.servers[server].description}</p> <div onclick=startGame("${serversJSON.servers[server].ip}") class="play-server"> <p class="server-play-text">Зайти на сервер</p> </div> </div>`
        }
    })
    
    
}

function startGame(server)
{
    if (launching != 1) {

        document.getElementById('status').innerHTML = 'Ожидание...'

        console.log(pathById)

        if(pathById.get(versionsSelect.value) != undefined)
        {
            console.log(pathById.get(versionsSelect.value));
            console.log(`${pathById.get(versionsSelect.value)} ${versionsSelect.value}`);
            ipcRenderer.invoke("start-vsn", versionsSelect.value, usernameInput.value, server);
        }
        else if(versionsSelect.value.startsWith("forge"))
        {
            ipcRenderer.invoke("start-vsn", versionsSelect.value.substr(5), usernameInput.value, server, undefined, versionsSelect.value.substr(5));
        }
        else if(versionsSelect.value.startsWith('modpack')) {
            let split = versionsSelect.value.split(';');

            ipcRenderer.invoke("start-vsn", split[1], usernameInput.value, server, undefined, 
                split[1], split[2], undefined, undefined, split[3]);
        }
        else if(versionsSelect.value.startsWith("omark"))
        {
            let split = versionsSelect.value.split('$')
            console.log(versionsSelect.value.split('$'))

            ipcRenderer.invoke("start-vsn", split[4], usernameInput.value, server, 
                split[1], undefined, undefined, split[3], split[2]);
        }
        else if (versionsSelect.value.startsWith("optifine")){
            let split = versionsSelect.value.split(';');
            ipcRenderer.invoke("start-optifine-version", split[1], usernameInput.value);
        }
        else
        {
            $.getJSON('https://launchermeta.mojang.com/mc/game/version_manifest.json', function(versionsJSON) {
                for(var key in versionsJSON.versions) {
                    //console.log(versionsSelect.value);
                    //console.log(versionsJSON.versions[key].id);
                    if (versionsJSON.versions[key].id === versionsSelect.value) {
                        $.getJSON(versionsJSON.versions[key].url, function(versionJSON) {
                            if(versionJSON.javaVersion === undefined)
                            {
                                ipcRenderer.invoke("start-vsn", versionsSelect.value, usernameInput.value, server, 
                                    undefined, undefined, undefined, 8, "jre-legacy");
                            }
                            else
                            {
                                console.log(`Java ${versionJSON.javaVersion.majorVersion} for \
                                Minecraft ${versionsJSON.versions[key].id}`);

                                //console.log(`Java majorVersion for ${versionsJSON.versions[key].id} is Java ${versionJSON.javaVersion.majorVersion}`);
                                ipcRenderer.invoke("start-vsn", versionsSelect.value, usernameInput.value, server, 
                                    undefined, undefined, undefined, versionJSON.javaVersion.majorVersion, versionJSON.javaVersion.component);
                            }
                            //     if(status===success) {
                            //         if(javaPath === undefined)
                            //             ipcRenderer.send('download-version', versionsJSON.versions[key].id, usernameInput.value, 'java')
                            //         else
                            //             ipcRenderer.send('download-version', versionsJSON.versions[key].id, usernameInput.value, javaPath)
                            //     }
                            // })
                        });

                        break;
                    }
                }
            });
        }
    }
}

function selectVersion(version) {
    for (option in versionsSelect.options)
    {
        console.log(option.value)
    }
}

function addUsername() {
    ipcRenderer.invoke("get-nickname");
    ipcRenderer.on("set-nickname", (event, nickname) => {
        if(nickname !== null) {
            usernameInput.value = nickname;
        } else {
            usernameInput.value = `QLauncher_${Math.floor(Math.random() * 1000000)}`
        }
    });
}

// refreshButton = document.getElementById('refresh-button')
// refreshButton.addEventListener('click', function() {
//     checkVersions()
// })

function installMod(url, hash, filename, minecraft)
{
    document.getElementById('status').innerHTML = 'Установка мода...'
    ipcRenderer.send('install-mod', url, hash, filename, minecraft)
}

function modChange()
{
    let children = document.getElementById('mod-table').children
    for(row in children)
    {
        children[row].innerHTML = ''
    }

    checkMods()
}

function modChangee()
{
    let children = document.getElementById('mod-tablee').children
    for(row in children)
    {
        children[row].innerHTML = '';
    }

    checkMods1();
}

function checkForges()
{
    let modsSelect = document.getElementById('mod-versions-select')
    let modsSelectt = document.getElementById('mod-versions-selectt')

    modsSelect.innerHTML = '';
    modsSelectt.innerHTML = '';
    $.getJSON('https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/forge-list.json', function(forgeJSON)
    {
        forgesMinecraftVersions = []

        let forges = forgeJSON.forges
        for(forge in forges)
        {
            if(!forgesMinecraftVersions.includes(forges[forge].minecraft)) {
                modsSelect.innerHTML += `<option value=\"`+forges[forge].minecraft+'\">Forge '+forges[forge].minecraft+'</option>'
                modsSelectt.innerHTML += `<option value=\"`+forges[forge].minecraft+'\">Forge '+forges[forge].minecraft+'</option>'
            
                forgesMinecraftVersions.push(forges[forge].minecraft);
            }
        }
        checkMods()
    });
}

function checkMods()
{
    let table = document.getElementById('mod-table')
    let children = table.children
    let forgeSelect = document.getElementById('mod-versions-select')
    $.getJSON('https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/mods-list.json', function(modsJSON)
    {
        let mods = modsJSON.mods
        for (mod in mods)
        {
            files = mods[mod]['downloads']
            for(file in files)
            {
                url = files[file]['url']
                let sel = forgeSelect.value
                //console.log(`${files[file]['minecraft']} - ${sel}`)
                if(files[file]['minecraft'] == sel)
                {
                    for(child in children)
                    {
                        if(child != 'length' && child != 'item' && child != 'namedItem')
                        {
                            if(children[child].children.length < 4)
                            {
                                children[child].innerHTML += `
                                <div class="content-cell"><img class="content-img" src="${mods[mod]['image-url']}">
                                    <p class="content-name">${mods[mod]['name']}</p>
                                    <p class="content-text">${mods[mod]['description-ru']}</p>
                                    <div onclick="installMod('${url}', '${files[file]['sha1']}', '${files[file]['filename']}', '${sel}')" class="mod-button">
                                        <p class="install-text">Установить</p>
                                    </div>
                                </div>
                                `
                                break;
                            }
                        }
                    }
                    break;
                }
            }
        }
    })
}

async function checkModpacks() {
    console.log("checkModpacks()");

    let table = document.getElementById('modpack-table')
    let rows = table.children;

    const localModpacks = (await ipcRenderer.invoke('check-modpacks')).modpacks;
    console.log(localModpacks);

    for(let row of rows)
    {
        row.innerHTML = "";
    }

    $.getJSON('https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/modpacks-list.json', function(modsJSON)
    {
        const classicRemoteModpacks = modsJSON.modpacks;
            
        for (let modpack of classicRemoteModpacks)
        {
            for(let row of rows)
            {
                if(row != 'length' && row != 'item' && row != 'namedItem')
                {
                    let cells = row.children;

                    if(cells.length < 4)
                    {
                        let isModpackInstalled = false;

                        console.log(modpack)
                        console.log(row)

                        /* this is so shitcody lol
                        i have no idea how to make this better */

                        for(let localModpack of localModpacks) {
                            if(localModpack.directory == modpack['directory-name']) {
                                isModpackInstalled = true;

                                row.innerHTML += `
                                <div class="content-cell"><img class="content-img" src="${modpack['image-url']}">
                                    <p class="content-name">${modpack['name']}</p>
                                    <p class="content-text">${modpack['description-ru']}</p>
                                    <div class="delete-button" onclick='deleteModPack(\`${modpack['directory-name']}\`)'>
                                        <p style=\"color:red;\" class="install-text">Удалить</p>
                                    </div>
                                </div>
                                `;

                                break;
                            }
                        }
                        
                        if(isModpackInstalled == false) {
                            let modpackCell = document.createElement('div');
                            modpackCell.className = 'content-cell';
                            modpackCell.innerHTML =`
                            <img class="content-img" src="${modpack['image-url']}">
                            <p class="content-name">${modpack['name']}</p>
                            <p class="content-text">${modpack['description-ru']}</p>
                            `;

                            let downloadModpackButton = document.createElement('div');
                            downloadModpackButton.className = 'mod-button';
                            downloadModpackButton.innerHTML = `<p class="install-text">Установить</p>`;

                            downloadModpackButton.addEventListener('click', () => {
                                console.log("downloadModpackButton pressed");

                                installModPack(modpack['directory-name'], JSON.stringify(modpack['mods']), modpack['minecraft-version'], modpack['name'], modpack["forgeVersion"]);
                                
                                document.getElementById('status').innerHTML = "Установка сборки...";
                            });

                            modpackCell.appendChild(downloadModpackButton);
                            row.appendChild(modpackCell);

                            console.log(modpack['name']);
                            console.log(downloadModpackButton);
                        }

                        break;
                    }
                }
            }
        }
    })
}

function deleteModPack(dir) {
    ipcRenderer.send('delete-modpack', dir)
    document.getElementById('status').innerHTML = "Удаление сборки...";
}

function installZipModPack(dir, zip, version, name) {
    ipcRenderer.send('installZipModPack', dir, zip, version, name);
}

function installModPack(dir, mods, version, name, forgeVersion) {
    ipcRenderer.send('installModPack', dir, mods, version, name, forgeVersion);
}

function startModPack(dir, mods, version, name) {
    ipcRenderer.send('installModPack', dir, mods, version, name);
}

// {
//     "name": "хуй пизда",
//     "directory": "hurroled-test",
//     "version": "1.8.9",
//     "className": "installed-modpack-wrapper"
// }

async function checkInstalledModpacks() {
    console.log(installedModpacks);

    let installedModpacksContent = document.getElementById('installed-wrapper');

    installedModpacksContent.innerHTML = '';

    for(let installedModpack of installedModpacks) {
        let installedModpackMods = [];

        if(typeof installedModpack["mods"] === "string") {
            installedModpack["mods"] = JSON.parse(installedModpack['mods']);
        }

        for(let mod of installedModpack['mods']) {
            installedModpackMods.push(mod.filename);
        }

        let installedModpackWrapper = document.createElement('div');
        installedModpackWrapper.className = 'installed-modpack-wrapper';

        let modpackName = document.createElement('p');
        modpackName.innerText = installedModpack['name'];

        let removeModpackButton = document.createElement('button');
        removeModpackButton.className = 'button remove';
        removeModpackButton.innerText = 'Удалить';

        let editModpackButton = document.createElement('button');
        editModpackButton.className = 'button edit';
        editModpackButton.innerText = 'Изменить';

        let playModpackButton = document.createElement('button');
        playModpackButton.className = 'button';
        playModpackButton.innerText = 'Запустить';

        let hints = document.createElement('div');
        hints.className = 'info';

        if(installedModpackMods.length < 20) {
            hints.innerHTML = `<p class="hint">Версия: ${installedModpack['version']}</p>
                <p class="hint">Моды (${installedModpackMods.length}): ${installedModpackMods.join(', ')}</p>`;
        } else {
            hints.innerHTML = `<p class="hint">Версия: ${installedModpack['version']}</p>
                <p class="hint">Модов в этой сборке: ${installedModpackMods.length}.</p>`;
        }

        console.log(installedModpack['mods']);

        installedModpackWrapper.append(modpackName, removeModpackButton, 
            playModpackButton, hints);

        installedModpacksContent.appendChild(installedModpackWrapper);

        removeModpackButton.addEventListener('click', () => {
            let modpack = new Modpack(installedModpack['name'],
            installedModpack['version'],
            installedModpack['mods'],
            installedModpack['directory'],
            installedModpack['forgeVersion']);

            modpack.backendClassInit();
            modpack.removeModpack();

            document.getElementById('status').innerHTML = "Удаление сборки...";
        });

        editModpackButton.addEventListener('click', async () => {
            installedModpacksWrapper.style.display = 'none';
            content5.style.display = 'block';
            dialog1.style.display = 'none';
            dialog2.style.display = 'block';

            let createdModpack = new CreatedModpack();
            createdModpack.setName(installedModpack['name']);
            createdModpack.setDirectory("modpack-"+makeID(30));

            checkForges();
            await checkModsForModpack(createdModpack, installedModpack["mods"]);

            document.getElementById('status').innerHTML = "Удаление старой сборки...";

            let oldModpack = new Modpack(installedModpack['name'],
            installedModpack['version'],
            installedModpack['mods'],
            installedModpack['directory'],
            installedModpack['forgeVersion']);

            await oldModpack.backendClassInit();
            await oldModpack.removeModpack();

            document.getElementById('status').innerHTML = "Установка новой сборки...";

            let newModpack = new Modpack(installedModpack['name'],
            createdModpack.version,
            createdModpack.mods,
            createdModpack.directory,
            createdModpack.forgeVersion);

            await newModpack.backendClassInit();
            await newModpack.downloadModpack();
        });

        playModpackButton.addEventListener('click', () => {
            let modpack = new Modpack(installedModpack['name'],
            installedModpack['version'],
            installedModpack['mods'],
            installedModpack['directory'],
            installedModpack['forgeVersion']);

            modpack.backendClassInit();
            modpack.startModpack(usernameInput.value);

            document.getElementById('status').innerHTML = "Запуск сборки...";
        });
    }
}

function createModpackButtonListener() {
    installedModpacksWrapper.style.display = 'none';
    content5.style.display = 'block';
}

window.onload = function() {
    let createModpackButton;
    createModpackButton = document.getElementById('modpack-button');
    createModpackButton.addEventListener('click', () => {
        let createdModpack = new CreatedModpack();

        let modpackVersionSelect;
        modpackVersionSelect = document.getElementById('mod-versions-selectt');
        modpackVersionSelect.addEventListener('change', () => {
            createdModpack.setVersion(modpackVersionSelect.value);
            createdModpack.setName(modpackNameInput.value);
            createdModpack.setDirectory('modpack-'+makeID(30));

            checkModsForModpack(createdModpack);
        });

        
    });

    checkForges()
    checkModpacks()
    addServers()
    addUsername()

    ipcRenderer.send('check-offline')
    // selectVersion('1.18.2')
    // loadModPacks()
}

ipcRenderer.on('set-progress', (e, progress) =>{
    console.log(progress)
    document.getElementById('progress-bar').style.width = `calc(${progress}%)`
})

ipcRenderer.on('launching-end', (e, progress) =>{
    launching = 0
})

ipcRenderer.on('check-modpacks', (e, progress) =>{
    checkModpacks()
})

ipcRenderer.on('set-status', (e, status) => {
    document.getElementById('status').innerHTML = status
})

ipcRenderer.on('offline-versions', (e, list, modpacks) => {
    checkVersions(list, modpacks)
})

ipcRenderer.on('console', (e, text) => {
    console.log(text);
})

async function checkCurseForgeModpacks() {
    
}
