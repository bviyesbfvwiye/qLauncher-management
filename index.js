const { Client, Authenticator } = require('minecraft-launcher-core');
const launcher = new Client();
const { app, BrowserWindow, ipcMain, webContents, ipcRenderer } = require('electron')
const fs = require('fs')
const unzipper = require('unzipper');
const sha1sum = require('sha1-sum');
const ncp = require('ncp');
const path = require('path');
const http = require('https')
const { Console, dir } = require('console');
const fetch = require('node-fetch');
const { version, type } = require('os');
const fse = require("fs-extra");
const { contains } = require('jquery');
const os = require('os');

let mainWindow

const createWindow = () => {
    const win = new BrowserWindow({
      width: 1100,
      height: 530,
      frame: false,
      resizable: true,
      icon: './64x64.png',
      webPreferences: {
        devTools: true,
        nodeIntegration: true,
        contextIsolation: false,
      }
    })

    mainWindow = win
  
    win.loadFile('./html/index.html')
}

var minMem = 0;
var maxMem = 0;
var defaultMemMultiplier = 1 / 2;
var defaultMemAllocationMode = false;

function count_mem(memMultiplier, freeMemInsteadOfTotal) {
  if(freeMemInsteadOfTotal) {
    minMem = Math.floor(os.freemem() * memMultiplier).toString();
    maxMem = Math.floor(os.freemem() * memMultiplier).toString();
  } else {
    minMem = Math.floor(os.totalmem() * memMultiplier).toString();
  maxMem = Math.floor(os.totalmem() * memMultiplier).toString();
  }

  if(minMem > 2000000000) {
    minMem = Math.floor(minMem / 1024).toString() + "K";
  }

  if(maxMem > 2000000000) {
    maxMem = Math.floor(maxMem / 1024).toString() + "K";
  }
}

app.whenReady().then(() => {
    createWindow()

    ipcMain.on('close', () => {app.exit(0)})

    init()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

var appdataPath
var gamePath
var java_path
var assetsPath
var gameAssets
var assetsIndexPath
var tempDir
var randomSum
var runtimePath
var modsPath
var versionsPath

function init() {
 appdataPath = app.getPath('appData')
 gamePath = appdataPath + '\\\.minecraft'
 versionsPath = gamePath + '\\versions'
 arch = process.arch
 launcher_name = 'minecraft-launcher'
 launcher_version = '1.0.0'
 //  java_path = 'C:\\Users\\HURROLED\\AppData\\Roaming\\\.minecraft\\runtime\\java-runtime-gamma\\windows\\java-runtime-gamma\\bin\\java\.exe'
 java_path = 'javaw'
 assetsPath = gamePath + '\\assets'
 assetsIndexPath = assetsPath + '\\indexes'
 tempDir = app.getPath('temp')
 randomSum = Math.floor(Math.random() * 1000000000)
 runtimePath = gamePath + '\\runtime'
 gameAssets = assetsPath + '\\virtual\\legacy'
 modsPath = gamePath + '\\mods'
}

function checkHash(path, hash, callback)
{
  if (fs.existsSync(path)) {
    sha1sum(path).then(sum => {
      console.log(path)
      console.log(sum)
      console.log(hash)
      if (sum === hash) {
        callback(true)
      } else {
        callback(false)
      }
    })
  } else {
    callback(false)
  }
}

function downloadFile(url, path, callback) {
    var http = require('https');
    var fs = require('fs');
  
    var file = fs.createWriteStream(path);
    var request = http.get(url, function(response) {
      response.pipe(file, { end: false });
      response.on('end', function(e){
        console.log(response['statusCode'])
        console.log(response['req']['host'])
        if(response['statusCode'] === 302)
        {
          if(response['req']['host'] === 'edge.forgecdn.net') {
            console.log(response['rawHeaders'][response['rawHeaders'].length-1])
            file.close(() => {
              downloadFile(response['rawHeaders'][response['rawHeaders'].length-1], path, callback)
            })
          } else if(response['req']['host'] === 'github.com') {
            console.log(response['rawHeaders'][9])
            file.close(() => {
              downloadFile(response['rawHeaders'][9], path, callback)
            })
          }
        }
        else
        {
          file.close(() => {
            callback('success', path, url)
          })
        }
      })
  
      request.on('error', function(err) {
        file.close(() => {
          if (err.code === "ECONNRESET") {
            console.log("ECONNRESET error");
            callback('err', null, null)
            //specific error treatment
          }
          //other error treatment
        })
      });
    });

  }

async function downloadFileAsync(url, path)
{
  return new Promise((resolve, reject) => {
    let file = fs.createWriteStream(path);
    let request = http.get(url, (response) => {
      response.pipe(file, { end: false });

      response.on('end', () => {
        if(response['statusCode'] === 302)
        {
          if(response['req']['host'] === 'edge.forgecdn.net') {
            console.log(response['rawHeaders'][response['rawHeaders'].length - 1]);
            file.close(() => {
              downloadFileAsync(response['rawHeaders'][response['rawHeaders'].length - 1], path).then(() => {
                resolve('success');
              });
            });
          } else if(response['req']['host'] === 'github.com') {
            console.log(response['rawHeaders'][9]);
            file.close(() => {
              downloadFileAsync(response['rawHeaders'][9], path).then(() => {
                resolve('success');
              });
            });
          }
        }
        else
        {
          file.close(() => {
            resolve('success');
          });
        }
      });

      request.on('error', function(err) {
        file.close(() => {
          reject(err);
        })
      });
    });
  });
}

  let launching = 0
function downloadVersion(id, userName, javaPath, forge, custom, server, path) {
  console.log('downloadVersion');

  console.log(`Custom: ${custom}`)
  console.log(`Server: ${server}`)
  console.log(`Forge: ${forge}`)
  console.log(`PATH: ${path}`)
  
  if(launching != 1)
  {
    launching = 1
    mainWindow.webContents.send('set-status', 'Запуск Minecraft...')

    count_mem(defaultMemMultiplier, defaultMemAllocationMode);

    let opts = {
        clientPackage: null,
        // For production launchers, I recommend not passing 
        // the getAuth function through the authorization field and instead
        // handling authentication outside before you initialize
        // MCLC so you can handle auth based errors and validation!
        authorization:
        {
            access_token: 'null',
            client_token: '',
            uuid: 'f2f54265a0eb4dc08ff00ed893072170',
            name: userName,
            user_properties: '{}',
            meta: {
                type: 'mojang',
                demo: false
            }
        },
        javaPath: javaPath,
        // javaPath: 'java',
        root: gamePath,
        version: {
          number: id,
          custom: custom,
          type: "release"
        },
        forge: forge,
        memory: {
            min: minMem,
            max: maxMem
        },
        overrides: {
          //gameDirectory: `${gamePath}\\forge\\${id}`,
          natives: `${gamePath}\\versions\\${id}\\natives`
        }
    }

    if(server != "") {
      opts['server'] = { host: server };
    }

    if(typeof path !== 'undefined') {
      opts['root'] = path;
      opts['overrides']['natives'] = `${path}\\versions\\${custom}\\natives`
    }
    
    console.log(javaPath)
    console.log(forge)
    console.log(id)


    launcher.launch(opts);

    mainWindow.webContents.send('set-status', 'Запуск Майнкрафта...')
  }
    
}

launcher.on('debug', (e) => 
    {
      console.log('[DEBUG] '+ e)
      if(e.endsWith('download assets')) {
        mainWindow.webContents.send('set-status', 'Загрузка ассетов...')
      } else if(e.endsWith('version json, this might take a bit')) {
        mainWindow.webContents.send('set-status', 'Генерация файлов. Это может занять много времени!')
      } else if(e.endsWith('download Minecraft version jar')) {
        mainWindow.webContents.send('set-status', 'Загрузка версии...')
      } else if(e.toLowerCase().includes("failed")) {
        throw Error(e);
      }
      
    });

    launcher.on('data', (e) => 
    {
      console.log('[MINECRAFT] ' + e);

      if(e.toLowerCase().includes("unable to launch")) {
        mainWindow.webContents.send('set-status', 'Игра крашнулась! Смотрите текст ошибки.');
        throw Error(e);
      } else if(e.toLowerCase().includes("game crashed!")) {
        var spawnObj = require('child_process').spawn;
        spawnObj('notepad.exe', [e.split("#@!@# ")[2].replace("\n", "").trim()]);
        fs.readFile(e.split("#@!@# ")[2].replace("\n", "").trim(), function (err, data) {
          if (err) throw err;
          if(data.indexOf("Pixel format not accelerated") >= 0){
            mainWindow.webContents.send('set-status', 'Не установлены драйверы на видеоускоритель!');
            throw Error("Итак, игра крашнулась из-за того, что игра не смогла использовать \
вашу видеокарту(/видеоядро/видеочип). Это связано с тем, что у вас не \
установлены или установлены старые драйверы на видеокарту \
(у вас она есть, даже если вы думаете, что её у вас нет). \
Скачайте программу CPU-Z, сначала попробуйте забить в Гугл название \
видеокарты из вкладки Graphics и скачать драйверы на неё (с сайта производителя!), \
а затем, если не получилось, забить в Гугл имя процессора \
из вкладки CPU и скачать драйверы на него, затем то же самое сделать \
для материнской платы на вкладке Mainboard, так как видеоядро может \
находится не только в видеокарте или процессоре, но так же быть \
распаяно и на материнской плате.\n\nP.S CPU-Z рекомендую \
скачивать потому, что dxdiag и Свойства системы показывают \
неполную информацию из-за отсутствия драйверов, с которыми у нас как раз проблемы. \
CPU-Z, в отличие от Windows, всегда справляется с поиском информации отлично \
даже без драйверов.");
          } else if(data.indexOf("Manually triggered debug crash") >= 0) {
            mainWindow.webContents.send('set-status', 'Краш игры вызван игроком намеренно.');
          } else {
            mainWindow.webContents.send('set-status', 'Игра крашнулась! Смотрите открывшийся документ.');
          }
        });
      } else if(e.toLowerCase().includes("could not reserve enough space for") || e.toLowerCase().includes("insufficient memory")) {
        mainWindow.webContents.send('set-status', 'Нехватка оперативной памяти!');
        throw Error("qLauncher ошибся с расчётом выделяемой памяти и попытался выделить больше памяти, чем свободно. Пишите на <webmaster@qlauncher.ru>.");
      }
      else {
        launching = 0
        mainWindow.webContents.send('launching-end')
        mainWindow.webContents.send('set-status', '')
      }

      // let unzipPath = `${tempDir}\\java-runtime-temp\\unzip`
      // if(fs.existsSync(unzipPath))
      // {
      //   let jdkDir = fs.readdirSync(unzipPath)
      //   for(let i in jdkDir) {
      //     fs.rmSync(`${unzipPath}\\${jdkDir[i]}`, { recursive: true, force: true });
        
      //     console.log(`${`${unzipPath}\\${jdkDir[i]}`} is deleted!`);
      //   }
      // }    
    });

ipcMain.on('download-version', (e, id, userName, server) => {
  downloadVersion(id, userName, java_path, forge, custom, server, path);
})

ipcMain.on('download-java', (e, majorVersion, callback, versionId, userName, component, forge, custom, server) =>
{
  console.log(`Renderer emitted the download-java event.`);
  downloadJava(e, majorVersion, callback, versionId, userName, component, forge, custom, server)
})


function deleteFolder(path) {
  let files = [];
  if( fs.existsSync(path) ) {
      files = fs.readdirSync(path);
      files.forEach(function(file,index){
          let curPath = path + "/" + file;
          if(fs.statSync(curPath).isDirectory()) {
              deleteFolder(curPath);
          } else {
              fs.unlinkSync(curPath);
          }
      });
      fs.rmdirSync(path);
  }
}


var downloadJava = async (e, majorVersion, callback, versionId, userName, component, forge, custom, server, path) => {
  console.log(`Entered downloadJava() function.`);
  
  mainWindow.webContents.send('set-status', 'Загрузка Java...')

  if(typeof path != 'undefined') {
    if(!path.includes('\\')) {
      path = appdataPath + "\\" + path
    }
  }

  let link = null
  let parsePath = `${tempDir}\\java-runtime-temp`
  let unzipPath = `${runtimePath}\\${component}`;
  let downloadPath = null
  let legacy_switch = 0
  let hash = null

  if(typeof(majorVersion) === 'string') {
    console.log("PIZDA");
    majorVersion = Number(majorVersion)
  }

  console.log("majorVersion: "+majorVersion);
  switch(majorVersion) {
    case 8:
      legacy_switch = 1
      break;
    case 16:
      link = 'https://github.com/adoptium/temurin16-binaries/releases/download/jdk-16.0.2%2B7/OpenJDK16U-jdk_x64_windows_hotspot_16.0.2_7.zip'
      downloadPath = `${parsePath}\\openjdk-16.0.2_windows-x64_bin.zip`
      hash = '3171b4bb3c7a8a5a0749d68c9343f9e2efb04ed9'
      break;
    case 17:
      console.log("downloadPath: "+downloadPath);
      link = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.6%2B10/OpenJDK17U-jre_x64_windows_hotspot_17.0.6_10.zip'
      downloadPath = `${parsePath}\\jdk-17_windows-x64_bin.zip`
      hash = '2ec836d7897d3925b8245a7035d70899adbf0b0e'
      console.log("downloadPath: "+downloadPath);
      break;
    case 18:
      link = 'https://github.com/adoptium/temurin18-binaries/releases/download/jdk-18.0.2.1%2B1/OpenJDK18U-jre_x64_windows_hotspot_18.0.2.1_1.zip'
      downloadPath = `${parsePath}\\jdk-18.0.2_windows-x64_bin.zip`
      hash = '9725d2296e5c855f2f6d66490fc3b4cd2b20ae7d'
      break;
    default:
      console.log('default');
      break;
  }

  console.log("downloadPath: "+downloadPath);

  function downloadJv() {
    console.log('downloadJv in downloadJava');

    downloadFile(link, downloadPath, function(status) {
      if (status === 'success') {
        console.log(`java ${majorVersion} downloaded at ${link} and put to ${downloadPath}`)
        let stream = fs.createReadStream(downloadPath).pipe(unzipper.Extract({ path: unzipPath }));
        stream.on('finish', () => {
          let archiveFileState = 0;
          fs.createReadStream(downloadPath)
            .pipe(unzipper.Parse())
            .on('entry', function (entry) {
              const fileName = entry.path;
              const type = entry.type; // 'Directory' or 'File'
              const size = entry.vars.uncompressedSize; // There is also compressedSize;
              if (type === "Directory") {
                if(archiveFileState === 0) {
                  archiveFileState = 1;

                  java_path = `${unzipPath}\\${entry.path.split('/')[0]}\\bin\\javaw.exe`;
                  downloadVersion(versionId, userName, java_path, forge, custom,server, path);
                  console.log('downloaded fully. launching');
                }
              } else {
                entry.autodrain();
              }
            });
        });
      }
    })
  }

  let i = 0
  function moveCount(filesCount)
  {
    i++

    console.log(`${i}/${filesCount}`)

    if(i === filesCount)
    {
      java_path = `${runtimePath}\\${component}\\windows\\${component}\\bin\\javaw.exe`
      downloadVersion(versionId, userName, java_path, forge, custom,server, path)
      console.log('downloaded fully. launching')
    }
  }

  if(legacy_switch === 0 && majorVersion != null)
  {
    fs.mkdir(unzipPath, {recursive: true}, err => {
      try {
        if (fs.existsSync(downloadPath)) {
          sha1sum(downloadPath).then(sum => {
            console.log(sum)
            console.log(hash)
            if (sum === hash)
            {
              console.log('hash is working')
              console.log(majorVersion)
              console.log(downloadPath)
              console.log(unzipPath)
              console.log(`${runtimePath}\\${component}\\windows`)
              
              let stream = fs.createReadStream(downloadPath).pipe(unzipper.Extract({ path: unzipPath }));
              stream.on('finish', () => {
                let archiveFileState = 0;
                fs.createReadStream(downloadPath)
                  .pipe(unzipper.Parse())
                  .on('entry', function (entry) {
                    const fileName = entry.path;
                    const type = entry.type; // 'Directory' or 'File'
                    const size = entry.vars.uncompressedSize; // There is also compressedSize;
                    if (type === "Directory") {
                      if(archiveFileState === 0) {
                        archiveFileState = 1;

                        java_path = `${unzipPath}\\${entry.path.split('/')[0]}\\bin\\javaw.exe`;
                        downloadVersion(versionId, userName, java_path, forge, custom,server, path);
                        console.log('downloaded fully. launching');
                      }
                    } else {
                      entry.autodrain();
                    }
                  });
              });

              console.log('hash is working2');
            }
            else
              downloadJv()
          })
        }
        else
          downloadJv()
      } catch(err) {
        downloadJv()
      }
    })
  }
  else {
    downloadVersion(versionId, userName, "java", forge, custom,server, path)
    console.log('legacy. launching')
  }
}

ipcMain.on('install-mod', (e, url, hash, filename, minecraft) => 
{
  console.log(url)
  fs.mkdir(modsPath, { recursive: true }, err => 
  {
    console.log(`${gamePath}\\forge\\${minecraft}\\mods\\${filename}`)
    downloadFile(url, `${modsPath}\\${filename}`, function callback(status)
    {
      if (status === 'success')
      {
        mainWindow.webContents.send('set-status', 'Мод установлен успешно.')
      }
    })
  })
})

ipcMain.on('check-offline', () => {
  checkOffline()
})

async function downloadJSON(url) {
  return new Promise((resolve) => {
    fetch(url, { method: "Get" })
      .then(res => res.json())
      .then((json) => {
        resolve(json);
      })
  });
}

async function checkOffline()
{
  let versionsList = []
  if (fs.existsSync(versionsPath))
  {
    var files = fs.readdirSync(versionsPath);
    let versionsManifestJSON = await downloadJSON("https://launchermeta.mojang.com/mc/game/version_manifest.json");
    for (var i in files)
    {
      if (fs.statSync(`${versionsPath}\\${files[i]}`).isDirectory())
      {
        if(fs.existsSync(`${versionsPath}\\${files[i]}\\${files[i]}\.json`))
        {
          try {
            versionJSON = JSON.parse(fs.readFileSync(`${versionsPath}\\${files[i]}\\${files[i]}\.json`))
          } catch(e) {
            continue;
          }

          let time = null

          let minecraftVersion;
          
          if(typeof versionJSON.id !== "undefined") {
            if(typeof versionsManifestJSON.versions.find(versionManifestJSON => versionManifestJSON.id === versionJSON.id) !== "undefined") {
              minecraftVersion = versionJSON.id;
            } else if(typeof versionJSON.inheritsFrom !== "undefined") {
                minecraftVersion = versionJSON.inheritsFrom;
              } else {
                minecraftVersion = versionJSON.assets;
              }
          } else if(typeof versionJSON.inheritsFrom !== "undefined") {
              minecraftVersion = versionJSON.inheritsFrom;
            } else {
              minecraftVersion = versionJSON.assets;
            }
          
          let component;
          let majorVersion;
          let inheritsFrom;

          if(typeof versionJSON.inheritsFrom !== 'undefined') {
            try {
              await fs.promises.access(`${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json`, fs.F_OK)
            
              console.log(`Inherit file is already present in path: ${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json`);

              let inheritsFrom = JSON.parse(fs.readFileSync(`${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json`, versionJSON));
              Object.assign(inheritsFrom, versionJSON);  // merging two jsons
              versionJSON = inheritsFrom;
            } catch (error) {
              console.log(`InheritsFrom JSON for ${versionJSON.id} does not exist in current directory. Downloading vanilla one.`)
            
              let versionsJSON = await downloadJSON('https://launchermeta.mojang.com/mc/game/version_manifest.json')

              // console.log(versionsJSON)
              console.log(`Versions manifest downloaded, searching for ${versionJSON.inheritsFrom} for version ${versionJSON.id}.`)

              for (let version in versionsJSON.versions) {
                if (versionsJSON.versions[version].id == versionJSON.inheritsFrom) {
                  console.log(`Version ${versionJSON.inheritsFrom} found for ${versionJSON.id}. Downloading JSON from URL ${versionsJSON.versions[version].url}, to path ${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json.`)
                  let downloadError = await downloadFileAsync(versionsJSON.versions[version].url, `${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json`);
                  
                  if(downloadError == 'success') {
                    console.log(`Downloaded ${versionJSON.inheritsFrom}.json for ${versionJSON.id} from URL ${versionsJSON.versions[version].url}, to path ${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json.`)
                    
                    try {
                      await fs.promises.access(`${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json`, fs.F_OK)

                      console.log(`Path ${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json exists! Version: ${versionJSON.id}`)
                      
                      inheritsFrom = JSON.parse(fs.readFileSync(`${versionsPath}\\${files[i]}\\${versionJSON.inheritsFrom}\.json`, versionJSON));
                      Object.assign(inheritsFrom, versionJSON);  // merging two jsons
                      versionJSON = inheritsFrom;
                    } catch (error) {
                      console.error(`Exists error: ${error}`)
                    }
                  }
                }
              }
            }
          }

          //console.log(versionJSON)
          mainWindow.webContents.send('console', versionJSON);

          if(typeof versionJSON.javaVersion !== 'undefined') {
            component = versionJSON.javaVersion.component;
            majorVersion = versionJSON.javaVersion.majorVersion;
          } else {
            component = 'jre-legacy';
            majorVersion = 8;
          }

          versionsList.push([versionJSON.id, files[i], minecraftVersion, time, component, majorVersion, files[i]])
        }
      }
    }
  }

  checkModPacks((packs) => {
    console.log(versionsList)
    mainWindow.webContents.send('offline-versions', versionsList, packs)
  })
}

ipcMain.on('download-forge', (e, url, hash, id, minecraft, username, java, component, server, path) =>
{
  mainWindow.webContents.send('set-status', 'Загрузка Forge...')
  forgesPath = `${gamePath}\\forges`
  
  fs.mkdir(forgesPath, { recursive: true }, err => 
  {
    if (fs.existsSync(`${forgesPath}\\${id}.jar`)) {
      sha1sum(`${forgesPath}\\${id}.jar`).then(sum => 
      {
        if(sum === hash)
        {
          downloadJava(null, java, null, minecraft, username, component, `${forgesPath}\\${id}.jar`, null, server, path)
        }
        else
        {
          downloadFile(url, `${forgesPath}\\${id}.jar`, () => 
          {
            downloadJava(null, java, null, minecraft, username, component, `${forgesPath}\\${id}.jar`,null,server, path)
          })
        }
      })
    }
    else
    {
      downloadFile(url, `${forgesPath}\\${id}.jar`, () => 
      {
        downloadJava(null, java, null, minecraft, username, component, `${forgesPath}\\${id}.jar`,null,server, path)
      })
    }
  })
})

async function installModPack(dir, modsJ, version, name, forgeVersion) {
  let assets = appdataPath + "\\" + dir + "\\assets"
  let path = appdataPath + "\\" + dir + "\\mods\\"
  if (!fs.existsSync(appdataPath + "\\" + dir + "\\mods")){
    fs.mkdirSync(appdataPath + "\\" + dir + "\\mods", { recursive: true });
  }

  let modpack = {
    "name": name,
    "directory": dir,
    "version": version,
    "mods": modsJ,
    "forgeVersion": forgeVersion
  }

  fs.access(gamePath + "\\modpacks.json", fs.F_OK, (err) => {
    if (err) {
      let mps = {
        "modpacks": []
      }
      mps.modpacks.push(modpack)
    
      fs.appendFileSync(gamePath + "\\modpacks.json", JSON.stringify(mps))
    }

    let packs = JSON.parse(fs.readFileSync(gamePath + "\\modpacks.json"))
    for (var pack in packs.modpacks) {
      if (packs.modpacks[pack].directory == dir) {
        console.log("already present!!")
        packs.modpacks.splice(pack, 1);
      }
    }

    packs.modpacks.push(modpack)

    fs.writeFileSync(gamePath + "\\modpacks.json", JSON.stringify(packs))
  })

  fse.copySync(`${gamePath}//forge`, appdataPath + "\\" + dir + "\\forge");

  let j = 0;
  let mods = JSON.parse(modsJ);
  let modsToDownload = []

  for (let mod in mods) {
    let f = fs.openSync(path+mods[mod].filename, 'w');
    fs.closeSync(f);
  }
//path+mods[mod].filename, mods[mod].sha1  modsToDownload[mod].url
  let promises = []
  let file = new File();
  for (let mod in mods) {
    promises.push(file.checkHashOrDownload(mods[mod].url, path+mods[mod].filename, mods[mod].sha1));
  }

  Promise.all(promises).then(() => {
    mainWindow.webContents.send('set-status',  `Сборка установлена успешно.`);

    checkOffline();
    mainWindow.webContents.send('check-modpacks');
  });
}

async function installZipModPack(dir, zip, version, name) {
  zip = JSON.parse(zip);

  let path = appdataPath + "\\" + dir + "\\mods\\zip\\"
  if (!fs.existsSync(appdataPath + "\\" + dir + "\\mods\\zip\\")){
    fs.mkdirSync(appdataPath + "\\" + dir + "\\mods\\zip\\", { recursive: true });
  }

  const modpackZipPath = path + zip.filename;
  const modpackUnzipPath = appdataPath + "\\" + dir + "\\";

  let modpack = {
    "name": name,
    "directory": dir,
    "version": version,
    "zip": zip
  }

  fs.access(gamePath + "\\modpacks.json", fs.F_OK, (err) => {
    if (err) {
      let mps = {
        "modpacks": []
      }
      mps.modpacks.push(modpack)
    
      fs.appendFileSync(gamePath + "\\modpacks.json", JSON.stringify(mps))
    }

    let packs = JSON.parse(fs.readFileSync(gamePath + "\\modpacks.json"))
    for (var pack in packs.modpacks) {
      if (packs.modpacks[pack].directory == dir) {
        console.log("already present!!")
        packs.modpacks.splice(pack, 1);
      }
    }

    packs.modpacks.push(modpack)

    fs.writeFileSync(gamePath + "\\modpacks.json", JSON.stringify(packs))
  });

  let file = new File();

  mainWindow.webContents.send('set-status', "Загрузка сборки...");
  await file.checkHashOrDownload(zip.url, modpackZipPath, zip.hash);

  mainWindow.webContents.send('set-status', "Распаковка сборки...");
  await file.unzip(modpackZipPath, modpackUnzipPath);

  console.log(`Modpack ${dir} downloaded fully.`);
  checkOffline();
  mainWindow.webContents.send('check-modpacks');

  mainWindow.webContents.send('set-status', "Сборка установлена успешно.");
}

ipcMain.on('delete-modpack', (e, dir) => {
  fs.access(gamePath + "\\modpacks.json", fs.F_OK, (err) => {
    if (err) {
      return
    }

    let packs = JSON.parse(fs.readFileSync(gamePath + "\\modpacks.json"))
    for (var pack in packs.modpacks) {
      if(packs.modpacks[pack].directory == dir) {
        packs.modpacks.splice(pack, 1);
      }
    }

    fs.writeFileSync(gamePath + "\\modpacks.json", JSON.stringify(packs))
  })

  fs.rmSync(appdataPath + "\\" + dir, { recursive: true, force: true });

  checkOffline()
  mainWindow.webContents.send('check-modpacks')

  mainWindow.webContents.send('set-status', "Сборка удалена успешно.");
})

ipcMain.handle('check-modpacks', async (event) => {
  let packs = await checkModpacks();
  return packs;
})

function checkModpacks() {
  return new Promise(resolve => {
    fs.access(gamePath + "\\modpacks.json", fs.F_OK, (err) => {
      if (err) {
        resolve({"modpacks": []})
        return
      }

      let packs = JSON.parse(fs.readFileSync(gamePath + "\\modpacks.json"))
      resolve(packs)
    })
  })
}

function checkModPacks(callback) {
  fs.access(gamePath + "\\modpacks.json", fs.F_OK, (err) => {
    if (err) {
      callback({"modpacks": []})
      return
    }

    let packs = JSON.parse(fs.readFileSync(gamePath + "\\modpacks.json"))

    // for (var pack in packs.modpacks) {
    //   let dir = packs.modpacks[pack].directory
    //   let path = appdataPath + "\\" + dir + "\\mods\\"
    //   console.log(dir)
    //   let j = 0;
    //   let modsToDownload = []

    //   let mods = JSON.parse(packs.modpacks[pack].mods)
    
    //   for (let mod in mods) {
    //     j++
    //     checkHash(path+mods[mod].filename, mods[mod].sha1, (ok) => {
    //       console.log(ok)
    //       if(ok == false) {
    //         console.log("File not downloaded.")
    //         modsToDownload.push(mods[mod])
    //       }
    
    //       j--
          
    //       if(j == 0) {
    //         console.log(modsToDownload)
    //         let i = 0;
    //         if(modsToDownload.length === 0) {
    //           if(i == 0) {
    //             console.log(`Modpack ${dir} checked fully.`)
    //             callback(packs)
    //           }
    //         } else {
    //           for (let mod in modsToDownload) {
    //             i++
    //             downloadFile(modsToDownload[mod].url, path+modsToDownload[mod].filename, () => {
    //               i--
    //               console.log(`Mod ${modsToDownload[mod].filename} downloaded.`)
    //               if(i == 0) {
    //                 console.log(`Modpack ${dir} checked fully.`)
    //                 callback(packs)
    //               }
    //             })
    //           }
    //         }
    //       }
    //     })
    //   }
    // }

    callback(packs)
  })

  // let i = 0;
  // let mods = JSON.parse(modsJ)
  // for (let mod in mods) {
  //   i++
  //   if(!checkHash(path+mods[mod].filename, mods[mod].sha1)) {
  //     downloadFile(mods[mod].url, path+mods[mod].filename, () => {
  //       i--
  //       console.log(`Mod ${mods[mod].filename} downloaded.`)
  //       if(i == 0) {
  //         console.log(`Modpack ${dir} downloaded fully.`)
  //       }
  //     })
  //   } else {
  //     i--

  //     if(i == 0) {
  //       console.log(`Modpack ${dir} downloaded fully.`)
  //     }
  //   }
  // }
}

ipcMain.on('start-offline', (e, minecraft, username, java, component, custom, server, forge) => 
{
  downloadJava(null, java, null, minecraft, username, component, forge, custom, server)
})

ipcMain.on('installModPack', (e, dir, mods, version, name, forgeVersion) => 
{
  installModPack(dir, mods, version, name, forgeVersion)
});

ipcMain.on('installZipModPack', (e, dir, zip, version, name) => 
{
  installZipModPack(dir, zip, version, name);
});

ipcMain.on('delete-mods', (e, id) => {
  let directory = modsPath;

  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), err => {
        if (err) throw err;
      });
    }
  });

  mainWindow.webContents.send('set-status', "Все установленные моды удалены.");
});

ipcMain.handle("start-vsn", async (event, versionID, userName, server, custom, forge, rootPath, javaVersion, component, forgeOwnVersion) => {
  let version = new Version(versionID, "https://launchermeta.mojang.com/mc/game/version_manifest.json", 
    userName, server, custom, forge, rootPath, javaVersion, component, forgeOwnVersion);

  version.startVersion();
});

class Version
{
  constructor(versionID, versionsManifestURL, username, server, custom, forgeVersion, rootPath, javaVersion, component, forgeOwnVersion) {
    this.username = username;
    this.server = server;
    this.custom = custom;
    this.forgeVersion = forgeVersion;
    this.forgeOwnVersion = forgeOwnVersion;

    this.versionsManifestURL = versionsManifestURL;

    this.versionID = versionID;

    this.rootPath = rootPath;

    this.javaVersion = javaVersion;
    this.component = component;

    if(typeof custom !== "undefined") {
      this.path = new VersionPath(appdataPath, custom);
    } else {
      this.path = new VersionPath(appdataPath, versionJSON);
    }

    this.file = new File();
  }

  async getVersionJSONURL(versionsManifestURL, versionID) {
    let versionsManifestJSON = await this.file.getJSONURL(versionsManifestURL);
    return versionsManifestJSON.versions.find(versionManifestJSON => versionManifestJSON.id === versionID).url;
  }
  
  async createDirectories() {
    return this.file.createDirectory(this.path.versionDirectoryPath);
  }

  async getVersionJSON(version) {
    if (await this.file.creatable(this.path.versionJSONPath)) {
      if (typeof this.custom === "undefined") {
        await this.file.downloadFile(await this.getVersionJSONURL(this.versionsManifestURL, this.versionID),
        this.path.versionJSONPath);
      }
      let versionJSON = await this.file.getJSONFile(this.path.versionJSONPath);
      if(typeof versionJSON.inheritsFrom !== "undefined") {
        let inheritsJSON = await this.getInheritsJSON(versionJSON.inheritsFrom);

        return Object.assign(versionJSON, inheritsJSON);
      }
      return versionJSON;
    }
  }

  async getInheritsJSON(version) {
    let versionJSONURL = await this.getVersionJSONURL(this.versionsManifestURL, version);
    await this.file.downloadFile(versionJSONURL, this.path.getInheritsJSONPath(version));
    return JSON.parse(await this.file.readFile(this.path.getInheritsJSONPath(version)));
  }

  async getJavaVersion() {
    let versionJSON;

    if(typeof this.custom !== "undefined") {
      versionJSON = await this.getVersionJSON(this.custom);
    } else {
      versionJSON = await this.getVersionJSON(this.versionID);
    }

    if (await this.file.exists(this.path.versionJSONPath)) {
      this.majorVersion = versionJSON.javaVersion.majorVersion;
      this.component = versionJSON.javaVersion.component;
      let javaVersion = { "majorVersion": this.majorVersion, "component": this.component };

      return javaVersion;
    }
  }

  async getJavaByVersion(version) {
    let java = {
      "version": null,
      "url": null,
      "hash": null,
      "fileName": null,
      "component": null
    };

    switch(version.majorVersion) {
      case 17:
        java.version = 17;
        java.url = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.6%2B10/OpenJDK17U-jre_x64_windows_hotspot_17.0.6_10.zip";
        java.fileName = "jdk-17_windows-x64_bin.zip";
        java.hash = "2ec836d7897d3925b8245a7035d70899adbf0b0e";
        java.firstArchiveDirectory = "jdk-17.0.6+10-jre";
        java.component = version.component;

        this.java = java;

        return this.java;
      case 16:
        java.version = 16;
        java.url = "https://github.com/adoptium/temurin16-binaries/releases/download/jdk-16.0.2%2B7/OpenJDK16U-jdk_x64_windows_hotspot_16.0.2_7.zip";
        java.fileName = "openjdk-16.0.2_windows-x64_bin.zip";
        java.hash = "3171b4bb3c7a8a5a0749d68c9343f9e2efb04ed9";
        java.firstArchiveDirectory = "jdk-16.0.2+7";
        java.component = version.component;
        
        this.java = java;

        return this.java;
      default:
        java.version = version.majorVersion;
        java.url = "https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u372-b07/OpenJDK8U-jre_x64_windows_hotspot_8u372b07.zip";
        java.fileName = "OpenJDK8U-jre_x64_windows_hotspot_8u372b07.zip";
        java.hash = "2925b4657c86ff51d44029ddee88a88df6f1b356";
        java.firstArchiveDirectory = "jdk8u372-b07-jre";
        java.component = version.component;
        
        this.java = java;

        return this.java;
    }
  }

  async getJava() {
    if(typeof this.forgeVersion === "undefined") {
      if(typeof this.javaVersion === "undefined") {
        return this.getJavaByVersion(await this.getJavaVersion());
      } else {
        return this.getJavaByVersion({ "majorVersion": parseInt(this.javaVersion), "component": this.component });
      }
      
    } else {
      return this.getJavaByForge(this.forgeVersion);
    }
  }

  async getJavaByForge(forge) {
    switch (forge) {
      case "1.20.1":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.20":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.19.4":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.19.3":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.19.2":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.19.1":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.19":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.18.2":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.18.1":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.18":
        return await this.getJavaByVersion({majorVersion: 17, component: "java-runtime-gamma"});
      case "1.17.1":
        return await this.getJavaByVersion({majorVersion: 16, component: "java-runtime-beta"});
      case "1.17":
        return await this.getJavaByVersion({majorVersion: 16, component: "java-runtime-beta"});
      default:
        return await this.getJavaByVersion({majorVersion: 8, component: "jre-legacy"});
    }
  }

  async downloadJava() {
    await this.createDirectories();  // создаём папку %mc%\versions\1.19.4
    let java = await this.getJava();  // получаем информацию о Java для её загрузки

    if (await this.file.exists(this.path.getJavaPath(java.component, java.firstArchiveDirectory))) {
      return new Promise((resolve) => { resolve(); });
    } else {
      await this.file.checkHashOrDownload(java.url, this.path.getJavaArchivePath(java.fileName), java.hash);
      return this.file.unzip(this.path.getJavaArchivePath(java.fileName), this.path.getJavaUnzipPath(java.component));
    }
  }

  async getForgeLink(version, ownVersion) {
    let forge = {
      "version": null,
      "url": null,
      "hash": null
    }

    let forgesJSON = await this.file.getJSONURL("https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/forge-list.json");
    forge.version = version;

    if(typeof ownVersion !== "undefined")
    {
      forge.url = forgesJSON.forges.find(forgeJSON => forgeJSON.version === ownVersion).url;
      forge.hash = forgesJSON.forges.find(forgeJSON => forgeJSON.version === ownVersion).hash;
    } else {
      forge.url = forgesJSON.forges.find(forgeJSON => forgeJSON.minecraft === version).url;
      forge.hash = forgesJSON.forges.find(forgeJSON => forgeJSON.minecraft === version).hash;
    }

    this.forge = forge;

    return this.forge;
  }

  async downloadForge() {
    let forge = await this.getForgeLink(this.forgeVersion, this.forgeOwnVersion);
    let forgePath = this.path.getForgePath(this.forgeVersion);
    await this.file.createDirectory(this.path.getForgesPath());

    await this.file.checkHashOrDownload(forge.url, forgePath, forge.hash);

    this.forgePath = forgePath;
    return this.forgePath;
  }

  async replaceLibraries() {
    if (await this.file.writable(this.path.versionJSONPath)) {
      let versionJSON = await this.file.getJSONFile(this.path.versionJSONPath);

      for(let library of versionJSON.libraries) {
        if(typeof library.artifact !== "undefined") {
          if(!library.artifact.url.startsWith("https://resource.fastrepo.org/file?link=")) {
            library.artifact.url = "https://resource.fastrepo.org/file?link=" + library.artifact.url;
          }
        }
      }

      return this.file.writeJSONFile(this.path.versionJSONPath, versionJSON);
    }
  }

  async startVersion() {
    await this.downloadJava();  // скачиваем JRE
    if(typeof this.forgeVersion !== "undefined") {
      await this.downloadForge();
    }

    if(typeof this.custom !== "undefined") {
      await this.replaceLibraries();
    }

    count_mem(defaultMemMultiplier, defaultMemAllocationMode);
 
    let options = {
        clientPackage: null,
        authorization:
        {
          access_token: 'null',
          client_token: '',
          uuid: 'f2f54265a0eb4dc08ff00ed893072170',
          name: this.username,
          user_properties: '{}',
          meta: {
              type: 'msa',
              demo: false
          }
        },
        javaPath: this.path.getJavaPath(this.java.component, this.java.firstArchiveDirectory),
        root: this.path.minecraftDirectoryPath,
        version: {
          number: this.versionID,
          custom: this.custom,
          type: "release"
        },
        forge: this.forgePath,
        memory: {
          min: minMem,
          max: maxMem
        },
        overrides: {
          assetRoot: `${this.path.getCommonRootPath()}/assets/`,
        }
    }


    if(typeof this.server !== "undefined") {
      options["server"] = { host: this.server };
    }

    if(typeof this.rootPath !== 'undefined') {
      if(!this.rootPath.includes('\\')) {
        this.rootPath = this.path.appdataDirectoryPath + "\\" + this.rootPath;
      }
      options['root'] = this.rootPath;
      options['overrides']['natives'] = `${this.rootPath}\\versions\\${this.versionID}\\natives`;
    }

    launcher.launch(options);
  }
}

class Path
{
  constructor(appdataDirectoryPath) {
    this.appdataDirectoryPath = appdataDirectoryPath;

    this.minecraftDirectoryPath = this.appdataDirectoryPath + "\\.minecraft";

    this.versionsDirectoryPath = this.minecraftDirectoryPath + "\\versions";
    this.modsDirectoryPath = this.minecraftDirectoryPath + "\\mods";
    this.runtimeDirectoryPath = this.minecraftDirectoryPath + "\\runtime";
    this.forgesDirectoryPath = this.minecraftDirectoryPath + "\\forges";
    this.librariesDirectoryPath = this.minecraftDirectoryPath + "\\libraries";
  }

  getCommonRootPath() {
    return this.minecraftDirectoryPath;
  }
}

class VersionPath extends Path
{
  constructor(appdataDirectoryPath, versionID) {
    super(appdataDirectoryPath);

    this.versionID = versionID;

    this.versionDirectoryPath = this.versionsDirectoryPath + "\\" + versionID;
    this.versionJSONPath = this.versionDirectoryPath + "\\" + versionID + ".json";
    this.versionJarPath = this.versionDirectoryPath + "\\" + versionID + ".json";

    this.versionNativesDirectoryPath = this.versionDirectoryPath + "\\natives";
  }

  getJavaArchivePath(javaArchiveFileName) {
    this.javaArchivePath = this.runtimeDirectoryPath + "\\" + javaArchiveFileName;
    return this.javaArchivePath;
  }

  getJavaUnzipPath(component) {
    this.javaUnzipPath = this.runtimeDirectoryPath + "\\" + component;
    return this.javaUnzipPath;
  }

  getJavaUnzippedPath(component, javaFirstArchiveDirectory) {
    this.javaUnzippedPath = this.runtimeDirectoryPath + "\\" + component + "\\" + javaFirstArchiveDirectory;
    return this.javaUnzippedPath;
  }

  getJavaPath(component, javaFirstArchiveDirectory) {
    this.javaPath = this.runtimeDirectoryPath + "\\" + component + "\\" + javaFirstArchiveDirectory + "\\bin\\javaw.exe";
    return this.javaPath;
  }

  getForgesPath() {
    return this.forgesDirectoryPath;
  }

  getForgePath(version) {
    this.forgePath = this.forgesDirectoryPath + "\\" + version + ".jar";
    return this.forgePath;
  }

  getVersionPath(version) {
    this.versionPath = this.versionsDirectoryPath + "\\" + version;
    return this.versionPath;
  }

  getVersionJSONPath(version) {
    this.versionJSONPath =  this.getVersionPath(version) + "\\" + version + ".json";
    return this.versionJSONPath;
  }

  getInheritsJSONPath(version) {
    this.inheritsJSONPath = versionsPath + "\\" + version + ".json";
    return this.inheritsJSONPath;
  }
}

var modpack;

ipcMain.handle('init-modpack', async (event, modpackName, modpackVersion, modpackMods, modpackDirectory, modpackForgeVersion) => {
  return new Promise((resolve, reject) => {
    modpack = new Modpack(modpackName, modpackVersion, modpackMods, modpackDirectory, modpackForgeVersion);

    resolve(modpack);  // resolving backend class to renderer
  });
});

ipcMain.handle('add-modpack', async (event) => {
  const addResult = await modpack.addModpackJSON();

  return addResult;
});

ipcMain.handle('download-modpack', async (event) => {
  const downloadResult = await modpack.downloadModpack();

  return downloadResult;
});

ipcMain.handle('remove-modpack', async (event) => {
  return modpack.removeModpack();
});

ipcMain.handle('start-modpack', async (event, username, server) => {
  return modpack.startModpack(username, server);
});

class Modpack
{
  constructor(modpackName, modpackVersion, modpackMods, modpackDirectory, modpackForgeVersion) {
    this.name = modpackName;
    this.version = modpackVersion;
    this.mods = modpackMods;
    this.directory = modpackDirectory;
    this.forgeVersion = modpackForgeVersion

    // CreatedModpackPath class will help us to easily get pathes we need
    this.path = new ModpackPath(appdataPath, this.directory, 'mods',
      '.minecraft', 'modpacks.json');

    this.file = new File();  // File class is simpler Node.js fs wrap, it can also check hashes, etc...
  }

  // this method directly adds class parameters into modpacks.json file
  async addModpackJSON() {
    let JSONPath = await this.path.getJSONPath();

    // our new modpack object to add to JSON file
    let modpack = {
      "name": this.name,
      "directory": this.directory,
      "version": this.version,
      "mods": this.mods,
      "forgeVersion": this.forgeVersion
    }
    
    if (await this.file.writable(JSONPath)) {
      let modpacks;  // array that already contains in the modpacks.json
      
      modpacks = JSON.parse(await this.file.readFile(JSONPath));  // reading modpacks from file

      if(!modpacks.modpacks.includes(modpack)) {
        modpacks.modpacks.push(modpack);  // pushing our modpack into the object
      }
      

      return this.file.writeStringToFile(JSONPath, JSON.stringify(modpacks));  // writing the object to file
    } else {
      if (!(await this.file.exists(JSONPath))) {
        let modpacks = {
          "modpacks": [
            modpack
          ]
        }

        return this.file.writeStringToFile(JSONPath, JSON.stringify(modpacks));  // writing the object to file
      } else {
        console.error('Writing to modpacks.json is not permitted.');

        return Promise.reject(false);
      }
    }
  }

  async createModpackDirectory() {
    return this.file.createDirectory(await this.path.getModsPath());  // creating modpacks and mods directories
  }

  async downloadModpack() {
    await this.createModpackDirectory();

    let downloadPromisesArray = [];  // array of downloadFileAsync promises to know when they all resolved

    for (let mod in this.mods) {
      let modPath = await this.path.getModPath(this.mods[mod].filename);
      let modUrl = this.mods[mod].url;
      let modHash = this.mods[mod].sha1;

      await this.file.createFile(modPath);

      if ((await this.file.checkHash(modPath, modHash)) === false) {  // checking file hashes
        downloadPromisesArray.push(downloadFileAsync(modUrl, modPath));  // downloading file if hashes do not coincide
      }
    }

    let allFilesDownloadedPromise = Promise.all(downloadPromisesArray);  // checking if mods downloaded

    checkOffline();

    return allFilesDownloadedPromise;
  }

  async removeModpackFromJSON() {
    let JSONPath = await this.path.getJSONPath();

    if (await this.file.writable(JSONPath)) {
      let modpacks;  // array that already contains in the modpacks.json
      
      modpacks = JSON.parse(await this.file.readFile(JSONPath));  // reading modpacks from file
      
      for(modpack in modpacks.modpacks) {
        if(modpacks.modpacks[modpack]['directory'] == this.directory) {
          modpacks.modpacks.splice(modpack, 1);  // removing this modpack
        }
      }

      return this.file.writeStringToFile(JSONPath, JSON.stringify(modpacks));  // writing the object to file
    }
  }

  async removeModpack() {
    this.file.removeDirectory(await this.path.getModpackPath());

    mainWindow.webContents.send('set-status', "Сборка удалена успешно.");

    await this.removeModpackFromJSON();

    checkOffline();
    mainWindow.webContents.send('check-modpacks');
  }

  async startModpack(username, server) {
    let version = new Version(this.version, "https://launchermeta.mojang.com/mc/game/version_manifest.json", 
      username, server, undefined, this.version, this.directory, undefined, undefined, this.forgeVersion);

    version.startVersion();
  }
}

class ModpackPath extends Path
{
  constructor(appdataPath, modpackDirectory, modsDirectory, minecraftDirectory, modpacksJSONName) {
    super(appdataPath);

    this.modpackDirectory = modpackDirectory;
    this.modsDirectory = modsDirectory;
    this.minecraftDirectory = minecraftDirectory;
    this.modpacksJSONName = modpacksJSONName;
  }

  async getAppdataPath() {
    return this.appdataDirectoryPath;
  }

  async getJSONPath() {
    return `${this.appdataDirectoryPath}\\${this.minecraftDirectory}\\${this.modpacksJSONName}`;
  }

  async getModsPath() {
    return `${this.appdataDirectoryPath}\\${this.modpackDirectory}\\${this.modsDirectory}`;
  }

  async getModPath(modFileName) {
    return `${this.appdataDirectoryPath}\\${this.modpackDirectory}\\${this.modsDirectory}\\${modFileName}`;
  }

  async getModpackPath() {
    return `${this.appdataDirectoryPath}\\${this.modpackDirectory}`;
  }
}

class File
{
  async exists(filePath) {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);  // just check file's existance

      return true;
    } catch (error) {
      return false;
    }
  }

  async writable(filePath) {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK | fs.constants.W_OK);  // check read and write permissons

      return true;
    } catch (error) {
      return false;
    }
  }

  async creatable(filePath) {
    if(!(await this.exists(filePath))) {
      return true;
    } else {
      if(await this.writable(filePath)) {
        return true;
      } else {
        return false;
      }
    }
  }

  async readFile(filePath) {
    try {
      const contents = await fs.promises.readFile(filePath, { encoding: 'utf8' });
      return contents;
    } catch (error) {
      return error;
    }
  }

  async createDirectory(directoryPath) {
    return fs.promises.mkdir(directoryPath, { recursive: true });
  }

  async removeDirectory(directoryPath) {
    return fs.promises.rm(directoryPath, { recursive: true });
  }

  async writeStringToFile(filePath, stringToAdd) {
    return fs.promises.writeFile(filePath, stringToAdd, { encoding: 'utf-8' });
  }

  async checkHash(filePath, hashToCheck) {
    try {mojang
      await fs.promises.access(filePath, fs.constants.F_OK);

      sha1sum(filePath).then(fileHash => {
        if (fileHash === hashToCheck) {
          return true;
        } else {
          return false;
        }
      })
    } catch (error) {
      return false;
    }
  }

  async getJSONURL(url) {
    return new Promise((resolve) => {
      fetch(url, { method: "Get" })
      .then(result => result.json())
      .then((json) => {
        resolve(json);
    });
    });
  }

  async unzip(archiveFilePath, unzipDirectoryPath) {
    return new Promise((resolve) => {
      let stream = fs.createReadStream(archiveFilePath).pipe(unzipper.Extract({ path: unzipDirectoryPath }));
      stream.on("finish", () => {
        resolve();
      });
    });
  }

  async downloadFile(fileURL, downloadPath) {
    return downloadFileAsync(fileURL, downloadPath);
  }

  async checkHashOrDownload(fileURL, downloadPath, fileHash) {
    return new Promise(async (resolve) => {
      if(await this.exists(downloadPath)) {
        if(await this.checkHash(downloadPath, fileHash)) {
          resolve();
        } else {
          await this.downloadFile(fileURL, downloadPath);
          resolve();
        }
      } else {
        await this.downloadFile(fileURL, downloadPath);
        resolve();
      }
    });
  }

  async getJSONFile(filePath) {
    return JSON.parse(await this.readFile(filePath));
  }

  async writeJSONFile(filePath, json) {
    return this.writeStringToFile(filePath, JSON.stringify(json));
  }

  async createFile(createFilePath) {
    let createdFile = (await fs.promises.open(createFilePath, "w"));
    return createdFile.close();
  }
}

class OptiFinePath extends Path
{
  _minecraftVersion;
  constructor(appdataDirectoryPath, minecraftVersion, optifineVersion, launchwrapperVersion) {
    super(appdataDirectoryPath);
    this._minecraftVersion = minecraftVersion;
    this._optifineVersion = optifineVersion;
    this._launchwrapperVersion = launchwrapperVersion;

    this._versionName = `${this._minecraftVersion}-OptiFine_${optifineVersion}`
  }

  get versionDirectoryPath() {
    return `${this.versionsDirectoryPath}\\${this._versionName}`;
  }

  get versionJSONPath() {
    return `${this.versionsDirectoryPath}\\${this._versionName}\\${this._versionName}.json`;
  }

  get optifineLibraryDirectoryPath() {
    return `${this.librariesDirectoryPath}\\optifine\\OptiFine\\${this._minecraftVersion}_${this._optifineVersion}`;
  }

  get launchwrapperDirectoryPath() {
    return `${this.librariesDirectoryPath}\\optifine\\launchwrapper-of\\${this._launchwrapperVersion}`;
  }

  get optifineLibraryPath() {
    return `${this.librariesDirectoryPath}\\optifine\\OptiFine\\${this._minecraftVersion}_${this._optifineVersion}\\OptiFine-${this._minecraftVersion}_${this._optifineVersion}.jar`;
  }

  get launchwrapperPath() {
    return `${this.librariesDirectoryPath}\\optifine\\launchwrapper-of\\${this._launchwrapperVersion}\\launchwrapper-of-${this._launchwrapperVersion}.jar`;
  }
}

ipcMain.handle("start-optifine-version", async (event, optifineVersion, userName) => {
  let optifine = new OptiFine(optifineVersion);

  optifine.startOptiFine(userName);
})

class OptiFine
{
  constructor(minecraftVersion) {
    this._minecraftVersion = minecraftVersion;

    this._file = new File();
  }

  async setOptifineInfo() {
    let optifinesJSON = await this._file.getJSONURL("https://raw.githubusercontent.com/HURROLED/qLauncher-management/main/optifine-list.json");
    let optifineJSON = optifinesJSON.optifines.find(optifineJSON => optifineJSON.minecraftVersion === this._minecraftVersion);

    this._optifineVersion = optifineJSON.optifineVersion;
    this._optifineLibraryLink = optifineJSON.jarLink;
    this._optifineVersionJSONLink = optifineJSON.versionJSONLink;
    this._launchwrapperLink = optifineJSON.launchwrapperLink;
    this._launchwrapperVersion = optifineJSON.launchwrapperVersion;
    this._versionID = `${this._minecraftVersion}-OptiFine_${this._optifineVersion}`;

    this._path = new OptiFinePath(appdataPath, this._minecraftVersion, this._optifineVersion, 
      this._launchwrapperVersion);
  }

  async makeDirectories() {
    if (! await this._file.exists(this._path.versionDirectoryPath))
      await this._file.createDirectory(this._path.versionDirectoryPath);

    if (! await this._file.exists(this._path.optifineLibraryDirectoryPath))
      await this._file.createDirectory(this._path.optifineLibraryDirectoryPath);

    if (! await this._file.exists(this._path.launchwrapperDirectoryPath))
      await this._file.createDirectory(this._path.launchwrapperDirectoryPath);
  }

  async downloadVersionJSON() {
    if (await this._file.creatable(this._path.versionJSONPath)) {
      return this._file.downloadFile(this._optifineVersionJSONLink, this._path.versionJSONPath);
    }
  }

  async downloadOptifineLibrary() {
    if (await this._file.creatable(this._path.optifineLibraryPath)) {
      return this._file.downloadFile(this._optifineLibraryLink, this._path.optifineLibraryPath);
    }
  }

  async downloadOptifineLaunchwrapper() {
    if (await this._file.creatable(this._path.launchwrapperPath) && this._launchwrapperLink != null) {
      return this._file.downloadFile(this._launchwrapperLink, this._path.launchwrapperPath);
    }
  }

  async installOptiFine() {
    await this.setOptifineInfo();
    await this.makeDirectories();
    await this.downloadVersionJSON();
    await this.downloadOptifineLaunchwrapper();
    return this.downloadOptifineLibrary();
  }

  async startOptiFine(userName, server) {
    await this.setOptifineInfo();

    await this.installOptiFine();

    let version = new Version(this._path._minecraftVersion, "https://launchermeta.mojang.com/mc/game/version_manifest.json", 
    userName, server, this._versionID, undefined, this._path.minecraftDirectoryPath, undefined, undefined);

    version.startVersion();
  }
}

class Nickname {
  async setNickname(nickname) {
    let file = new File();

    if (await file.creatable(gamePath + "/nickname.txt")) {
      return file.writeStringToFile(gamePath + "/nickname.txt", nickname);
    }
  }

  async getNickname() {
    let file = new File();

    if (await file.exists(gamePath + "/nickname.txt")) {
      return file.readFile(gamePath + "/nickname.txt");
    } else {
      return null;
    }
  }
}

ipcMain.handle("remember-nickname", (event, nickname) => {
  (new Nickname()).setNickname(nickname);
});

ipcMain.handle("get-nickname", async (event) => {
  let nickname = await (new Nickname()).getNickname();
  mainWindow.webContents.send("set-nickname", nickname);
});
