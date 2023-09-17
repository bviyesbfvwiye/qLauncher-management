const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const oslib = require('os')
const child_process = require('child_process')
let mainWindow
const fs = require('fs')
const { dialog } = require('electron')
const unzipper = require('unzipper')
const ncp = require('ncp')
const sha1sum = require('sha1-sum');
const { Console } = require('console');
const fetch = require('node-fetch');

const createWindow = () => {
    const win = new BrowserWindow({
      width: 1100,
      height: 530,
      frame: false,
      resizable: true,  // should be false on release
      webPreferences: {
        nodeIntegration: false,  // should be true on release
        contextIsolation: true,  // should be false on release
      }
    })

    mainWindow = win
  
    win.loadFile('./html/index.html')
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

// process
//   .on('unhandledRejection', (reason, p) => {
//     console.log(reason, 'Unhandled Rejection at Promise', p);
//   })
//   .on('uncaughtException', err => {
//     console.log(err.stack);
//   });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

function downloadFile(url, path, callback) {
  var http = require('https');
  var fs = require('fs');

  var file = fs.createWriteStream(path);
  var request = http.get(url, function(response) {
    response.pipe(file, { end: false });
    response.on('end', function(e){
      callback('success', path, url)
    })

    request.on('error', function(err) {
      if (err.code === "ECONNRESET") {
        console.log("ECONNRESET error");
        callback('err', null, null)
        //specific error treatment
      }
      //other error treatment
    });
  });
}

function runCommand(command, callback) {
  let tempFile = tempDir + '\\1\.bat'
  fs.writeFileSync(tempFile, command)
  console.log(tempFile)

  var child = child_process.spawn(tempFile, null, {
      encoding: 'utf8',
      shell: false
  });
  // You can also use a variable to save the output for when the script closes later
  child.on('error', (error) => {
      dialog.showMessageBox({
          title: 'Title',
          type: 'warning',
          message: 'Error occured.\r\n' + error
      });
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (data) => {
      //Here is the output
      data=data.toString();   
      console.log(data);      
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (data) => {
      // Return some data to the renderer process with the mainprocess-response ID
      mainWindow.webContents.send('mainprocess-response', data);
      //Here is the output from the command
      console.log(data);  
  });

  if (typeof callback === 'function')
      callback();
}

var appdataPath
var gamePath
var versionsPath
var os
var osVersion
var arch
var launcher_name
var launcher_version
var java_path
var assetsPath
var gameAssets
var assetsIndexPath
var tempDir
var randomSum
var runtimePath
var pre17w43a
var assetsIndexId

function init() {
 appdataPath = app.getPath('appData')
 gamePath = appdataPath + '\\\.minecraft'
 versionsPath = gamePath + '\\versions'
 if (process.platform === 'darwin') {
  os = 'osx'
 }
 else if (process.platform === 'win32') {
  os = 'windows'
 }
 else if (process.platform === 'linux') {
  os = 'linux'
 }
 osVersion = oslib.release()
 arch = process.arch
 launcher_name = 'minecraft-launcher'
 launcher_version = '1.0.0'
//  java_path = 'C:\\Users\\HURROLED\\AppData\\Roaming\\\.minecraft\\runtime\\java-runtime-gamma\\windows\\java-runtime-gamma\\bin\\java\.exe'
 java_path = 'java'
 assetsPath = gamePath + '\\assets'
 assetsIndexPath = assetsPath + '\\indexes'
 tempDir = app.getPath('temp')
 randomSum = Math.floor(Math.random() * 1000000000)
 runtimePath = gamePath + '\\runtime'
 gameAssets = assetsPath + '\\virtual\\legacy'
}

String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
function () {
    "use strict";
    var str = this.toString();
    if (arguments.length) {
        var t = typeof arguments[0];
        var key;
        var args = ("string" === t || "number" === t) ?
            Array.prototype.slice.call(arguments)
            : arguments[0];

        for (key in args) {
            str = str.replace(new RegExp("\\\${" + key + "\\}", "gi"), args[key]);
        }
    }

    return str;
}

function downloadJava(majorVersion, component, callback) {
  mainWindow.webContents.send('set-status', 'Загрузка Java...')

  let link = null
  let parsePath = `${tempDir}\\java-runtime-temp`
  let unzipPath = `${tempDir}\\java-runtime-temp\\unzip`
  let downloadPath = null
  let legacy_switch = 0
  let hash = null
  switch(majorVersion) {
    case 8:
      legacy_switch = 1
      break;
    case 16:
      link = 'https://download.oracle.com/otn/java/jdk/16.0.2+7/d4a915d82b4c4fbb9bde534da945d746/jdk-16.0.2_windows-x64_bin.zip?AuthParam=1659333788_3fe4113c201db162f167301b83e2dc00'
      downloadPath = `${parsePath}\\jdk-16.0.2_windows-x64_bin.zip`
      hash = 'e7591dc603720fde2170b9643ce544faae7b801a'
      break;
    case 17:
      link = 'https://download.oracle.com/java/17/latest/jdk-17_windows-x64_bin.zip'
      downloadPath = `${parsePath}\\jdk-17_windows-x64_bin.zip`
      hash = '6915ae953b9c7a14ac2aeef0837b83eade5cba91'
      break;
    case 18:
      link = 'https://download.oracle.com/java/18/archive/jdk-18.0.2_windows-x64_bin.zip'
      downloadPath = `${parsePath}\\jdk-18.0.2_windows-x64_bin.zip`
      hash = '7620de255969d129f29b37a458ac3cdafb1b532f'
      break;
  }

  function downloadJv() {
    downloadFile(link, downloadPath, function(status) {
      if (status === 'success') {
        console.log(`java ${majorVersion} downloaded at ${link} and put to ${downloadPath}`)
        let stream = fs.createReadStream(downloadPath).pipe(unzipper.Extract({ path: unzipPath }));
        stream.on('finish', () => {
          let jdkDir = fs.readdirSync(unzipPath)
          for(let i in jdkDir) {
            let files = fs.readdirSync(`${unzipPath}\\${jdkDir[i]}`)
            for(let j in files) 
            {
              console.log(`${runtimePath}\\${component}\\windows\\${component}\\${files[j]}`)
              if(files[j].includes('.'))
              {
                fs.mkdir(`${runtimePath}\\${component}\\windows\\${component}`, { recursive: true }, err => {
                  ncp(`${unzipPath}\\${jdkDir[i]}\\${files[j]}`, `${runtimePath}\\${component}\\windows\\${component}\\${files[j]}`, function (err) {
                    if (err) { return console.error(err); }
                  });
                })
              }
              else
              {
                fs.mkdir(`${runtimePath}\\${component}\\windows\\${component}\\${files[j]}`, { recursive: true }, err => {
                  ncp(`${unzipPath}\\${jdkDir[i]}\\${files[j]}`, `${runtimePath}\\${component}\\windows\\${component}\\${files[j]}`, function (err) {
                    if (err) { return console.error(err); }
                  });
                })
              }
            }
          }

          java_path = `${runtimePath}\\${component}\\windows\\${component}\\bin\\java.exe`
          callback('success')
        })
      }
    })
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

              let stream = fs.createReadStream(downloadPath).pipe(unzipper.Extract({ path: unzipPath }));
              stream.on('finish', () => {
                let jdkDir = fs.readdirSync(unzipPath)
                for(let i in jdkDir) {
                  let files = fs.readdirSync(`${unzipPath}\\${jdkDir[i]}`)
                  for(let j in files) 
                  {
                    console.log(`${runtimePath}\\${component}\\windows\\${component}\\${files[j]}`)
                    if(files[j].includes('.'))
                    {
                      fs.mkdir(`${runtimePath}\\${component}\\windows\\${component}`, { recursive: true }, err => {
                        ncp(`${unzipPath}\\${jdkDir[i]}\\${files[j]}`, `${runtimePath}\\${component}\\windows\\${component}\\${files[j]}`, function (err) {
                          if (err) { return console.error(err); }
                        });
                      })
                    }
                    else
                    {
                      fs.mkdir(`${runtimePath}\\${component}\\windows\\${component}\\${files[j]}`, { recursive: true }, err => {
                        ncp(`${unzipPath}\\${jdkDir[i]}\\${files[j]}`, `${runtimePath}\\${component}\\windows\\${component}\\${files[j]}`, function (err) {
                          if (err) { return console.error(err); }
                        });
                      })
                    }
                  }
                }
      
                java_path = `${runtimePath}\\${component}\\windows\\${component}\\bin\\java.exe`
                callback('success')
              })
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
  else callback('success')
}

ipcMain.on('download-version', (e, id, url, username, versionJsonPath) => {
  let fs = require('fs');

  const directory = `${tempDir}\\minecraft-natives-temp`;

  fs.stat('path/to/dir', function(err) {
    if (!err) {
      fs.readdir(directory, (err, files) => {
        if (err) throw err;
    
        for (const file of files) {
          fs.unlink(path.join(directory, file), err => {
            if (err) throw err;
          });
        }
      });
    }
    else if (err.code === 'ENOENT') {
      console.log('no tempdir');
    }
  });

  let versionPath = versionsPath + '\\' + id

  fs.mkdir(versionPath, { recursive: true }, err => {
        let versionJSON

        if(versionJsonPath === null)
        {
          console.log('ckmewoifnwejofpewrnfjuip')
          downloadFile(url, `${versionPath}\\${id}\.json`, function(status) {
            if (status === 'success') {
              versionJSON = JSON.parse(fs.readFileSync(`${versionPath}\\${id}\.json`));
              versionJSONDl()
            }
          })
        }
        else
        {
          versionJSON = JSON.parse(fs.readFileSync(versionJsonPath))
          versionJSONDl()
        }

        function versionJSONDl() {
        let auth_player_name = username
        let tempargs
        if(versionJSON.arguments != undefined)
        {
          pre17w43a = 0
          tempargs = versionJSON.arguments.game
        }
        else if (versionJSON.minecraftArguments != undefined)
        {
          pre17w43a = 1
          tempargs = versionJSON.minecraftArguments
          tempargs = tempargs.split(' --')
          // for (arg in tempargs) {
          //   tempargs[arg] = "--"+tempargs[arg]
          // }
          tempargs.forEach(function(item, i, tempargs) {
            if(i!=0)
            {
              tempargs[i] = "--"+tempargs[i]
            }
              
            if(tempargs[i]==='--accessToken ${auth_access_token}' || tempargs[i]==='--uuid ${auth_uuid}' || tempargs[i]==='--userProperties ${user_properties}')
            {
              tempargs[i] = ''
            }

            console.log(tempargs[i])
          });
        }
        let gameArguments = tempargs
        let jvmArguments = []
        let libraries = []
        let jar_path = 'jar_path'
        let classpath = versionJSON.mainClass
        let version_name = versionJSON.id
        let game_directory = gamePath
        let assets_root = assetsPath
        let game_assets = gameAssets
        if(versionJSON.assetIndex !== undefined)
        {
          let asset_index_name = versionJSON.assetIndex.id
        }
        else
        {
          let asset_index_name = versionJSON.assets
        }
        let auth_uuid = `e36a3e2dbeb6494387fcbb513026576a`
        let auth_access_token = 'null'
        let clientid = 'null'
        let auth_xuid = 'null'
        let user_type = 'mojang'
        let version_type = versionJSON.type
        let natives_directory = `${versionPath}\\natives`
        let majorVersion
        let component

        if(versionJSON.javaVersion === undefined)
        {
          majorVersion = null
          component = null
        }
        else
        {
          majorVersion = versionJSON.javaVersion.majorVersion
          component = versionJSON.javaVersion.component
        }


        downloadJava(majorVersion, component, function callback(status) {
          if (status === 'success') {
            jar_path = `${versionPath}\\${id}\.jar`
            jarURL = versionJSON.downloads.client.url
            let hash = versionJSON.downloads.client.sha1
            console.log(jarURL)
            mainWindow.webContents.send('set-status', 'Загрузка клиента...')

            try {
              if (fs.existsSync(jar_path)) {
                sha1sum(jar_path).then(sum => {
                  console.log(sum)
                  console.log(hash)
                  if (sum === hash)
                  {
                    console.log('client hashsum is working')
                    callback('success')
                  }
                  else
                    downloadFile(jarURL, jar_path, callback)
                })
              }
              else
                downloadFile(jarURL, jar_path, callback)
            } catch(err) {
              downloadFile(jarURL, jar_path, callback)
            }

            function callback(status) {
              if (status === 'success') {
                i = 0

                librariesCount = 0

                for(var key in versionJSON.libraries){
                  if(versionJSON.libraries[key].downloads.classifiers != undefined) {
                    if (versionJSON.libraries[key].downloads.classifiers['natives-windows'] != undefined)
                    {
                      librariesCount++
                    }
                  }
                  else if (versionJSON.libraries[key].downloads.artifact != undefined) {
                    if(!versionJSON.libraries[key].name.endsWith('3.2.1'))
                      librariesCount++
                  }
                }

                function librariesCounter()
                {
                  i++
                  console.log(`${i}/${Object.values(versionJSON.libraries).length}`)


                  mainWindow.webContents.send('set-status', `Загрузка библиотек (${i}/${librariesCount})`)

                  mainWindow.webContents.send('set-progress', i/librariesCount*100)
                  
                  if(i === librariesCount) {
                    downloadAssets()
                    mainWindow.webContents.send('set-progress', 0)
                  }
                }

                // for(var key in versionJSON.libraries){
                //   if(versionJSON.libraries[key].downloads.classifiers != undefined){
                //     if (versionJSON.libraries[key].downloads.classifiers['natives-windows'] != undefined)
                //     {
                //       let unzipPath = `${tempDir}\\minecraft-natives-temp`
                //       let downloadPath = `${unzipPath}\\${versionJSON.libraries[key].downloads.classifiers['natives-windows'].path.split('/').pop()}`
                      
                      
                //       unzipPath += '\\unzip'
                //       // console.log(unzipPath)
                //       // console.log(downloadPath)
                //       let downloadUrl = `${versionJSON.libraries[key].downloads.classifiers['natives-windows'].url}`
                      
                //       fs.mkdir(unzipPath, { recursive: true }, err => {
                //         downloadFile(downloadUrl, downloadPath, function(status, path, url) 
                //         {
                //           if (status == 'success') {
                //             console.log(`! NATIVE !  ${path} -- ${url}  ! NATIVE !`)
                //             librariesCounter()

                //             let stream = fs.createReadStream(downloadPath).pipe(unzipper.Extract({ path: unzipPath }));
                //             stream.on('finish', () => {
                //               let files = fs.readdirSync(unzipPath)
                //               for(let i in files) {
                //                 fs.mkdir(`${versionPath}\\natives`, { recursive: true }, err => {
                //                   ncp(`${unzipPath}\\${files[i]}`, `${versionPath}\\natives\\${files[i]}`, function (err) {
                //                     if (err) { return console.error(err); }
                //                   });
                //                 })
                //               }
                //             })
                //           }
                //         })
                //       })

                //       // unzipPathDir = unzipPath.split('/')
                //       // unzipPathDir.pop()
                //       // console.log(unzipPathDir.join('\\'))
                //       // console.log(libraryPath)
                //       // let temp_url = versionJSON.libraries[key].downloads.artifact.url
                //     }
                //   }
                //   else if (versionJSON.libraries[key].downloads.artifact != undefined) {
                //     if(!versionJSON.libraries[key].name.endsWith('3.2.1'))
                //     {
                //       function downloadLibrary(libraryPathCurr)
                //       {
                //         let libraryPathDir = libraryPathCurr.split('/')
                //         libraryPathDir.pop()
                //         console.log(libraryPathDir.join('\\'))
                //         console.log(libraryPathCurr)
                //         let temp_url = versionJSON.libraries[key].downloads.artifact.url
                //         fs.mkdir(libraryPathDir.join('\\'), { recursive: true }, err => {
                //           downloadFile(temp_url, libraryPathCurr, function(status, path, url) 
                //           {
                //             if (status == 'success') {
                //               console.log(`${path} -- ${url}`)
                //               librariesCounter()
                //               libraries.push(libraryPathCurr)
                //             }
                //           })
                //         })
                //       }

                //       let libraryPath = `${gamePath}\\libraries\\${versionJSON.libraries[key].downloads.artifact.path}`
                    
                //       if(versionJSON.libraries[key].downloads.artifact.sha1 != undefined)
                //       {
                //         // sha1sum(libraryPath).then(sum => (checksum = sum));
                //         sha1sum(libraryPath).then(sum => {
                //           let checksum = sum

                //           console.log(checksum)
                //           console.log(versionJSON.libraries[key].downloads.artifact.sha1)
                //           if (checksum === versionJSON.libraries[key].downloads.artifact.sha1)
                //           {
                //             console.log('checksum is working')
                //             librariesCounter()
                //             libraries.push(libraryPath)
                //           }
                //           else{
                //             downloadLibrary(libraryPath)
                //           }
                //         });
                //       }
                //       else {
                //         downloadLibrary(libraryPath)
                //       }
                //     }
                //   }
                // }

                for(var key in versionJSON.libraries){
                  if(versionJSON.libraries[key].downloads.classifiers != undefined){
                    if (versionJSON.libraries[key].downloads.classifiers['natives-windows'] != undefined)
                    {
                      let unzipPath = `${tempDir}\\minecraft-natives-temp\\${randomSum}`
                      let downloadPath = `${unzipPath}\\${versionJSON.libraries[key].downloads.classifiers['natives-windows'].path.split('/').pop()}`
                      
                      unzipPath += '\\unzip'
                      console.log(unzipPath)
                      console.log(downloadPath)
                      let downloadUrl = `${versionJSON.libraries[key].downloads.classifiers['natives-windows'].url}`
                      
                      fs.mkdir(unzipPath, { recursive: true }, err => {
                        downloadFile(downloadUrl, downloadPath, function(status, path, url) 
                        {
                          if (status == 'success') {
                            console.log(`! NATIVE !  ${path} -- ${url}  ! NATIVE !`)
                            librariesCounter()

                            let stream = fs.createReadStream(downloadPath).pipe(unzipper.Extract({ path: unzipPath }));
                            stream.on('finish', () => {
                              let files = fs.readdirSync(unzipPath)
                              for(let i in files) {
                                fs.mkdir(`${versionPath}\\natives`, { recursive: true }, err => {
                                  ncp(`${unzipPath}\\${files[i]}`, `${versionPath}\\natives\\${files[i]}`, function (err) {
                                    if (err) { return console.error(err); }
                                  });
                                })
                              }
                            })
                          }
                        })
                      })

                      // unzipPathDir = unzipPath.split('/')
                      // unzipPathDir.pop()
                      // console.log(unzipPathDir.join('\\'))
                      // console.log(libraryPath)
                      // let temp_url = versionJSON.libraries[key].downloads.artifact.url
                    }
                  }
                  else if (versionJSON.libraries[key].downloads.artifact != undefined) {
                    if(!versionJSON.libraries[key].name.endsWith('3.2.1'))
                    {
                      let libraryPath = `${gamePath}\\libraries\\${versionJSON.libraries[key].downloads.artifact.path}`
                      let url = versionJSON.libraries[key].downloads.artifact.url
                      let hash = versionJSON.libraries[key].downloads.artifact.sha1
                      
                      if (fs.existsSync(libraryPath)) {
                        let name = versionJSON.libraries[key].name
                        sha1sum(libraryPath).then(sum => {
                          let checksum = sum

                          console.log(`Library Path: ${libraryPath}`)
                          console.log(`Library Source URL: ${url}`)
                          console.log(`Library Source Hash: ${hash}`)
                          console.log(`Existing File Hash: ${checksum}`)
                          if (checksum === hash)
                          {
                            console.log('checksum is working')
                            librariesCounter()
                            libraries.push(libraryPath)
                            console.log(libraryPath)
                          }
                          else
                          {
                            libraryPathDir = libraryPath.split('/')
                            libraryPathDir.pop()
                            // console.log(libraryPathDir.join('\\'))
                            // console.log(libraryPath)
                            let temp_url = url
                            fs.mkdir(libraryPathDir.join('\\'), { recursive: true }, err => {
                              downloadFile(temp_url, libraryPath, function(status, path, url) 
                              {
                                if (status == 'success') {
                                  // console.log(`${path} -- ${url}`)
                                  librariesCounter()
                                  libraries.push(libraryPath)
                                }
                              })
                            })
                          }
                        });
                      }
                      else
                      {
                        libraryPathDir = libraryPath.split('/')
                        libraryPathDir.pop()
                        // console.log(libraryPathDir.join('\\'))
                        // console.log(libraryPath)
                        let temp_url = url
                        fs.mkdir(libraryPathDir.join('\\'), { recursive: true }, err => {
                          downloadFile(temp_url, libraryPath, function(status, path, url) 
                          {
                            if (status == 'success') {
                              // console.log(`${path} -- ${url}`)
                              librariesCounter()
                              libraries.push(libraryPath)
                            }
                          })
                        })
                      }
                      

                      // function downloadLibrary(libraryPath) {
                        
                      // }
                    }
                  }
                }

                function downloadAssets() {
                  let assetsIndexURL = versionJSON.assetIndex.url
                  assetsIndexId = versionJSON.assetIndex.id
          
                  fs.mkdir(assetsIndexPath , {recursive: true}, err => {
                    downloadFile(assetsIndexURL, `${assetsIndexPath}\\${assetsIndexId}\.json`, function(status) {
                      if (status === 'success') {
                        let assetsJSON = JSON.parse(fs.readFileSync(`${assetsIndexPath}\\${assetsIndexId}\.json`))
          
                        j = 0
                        l = 0
                        function assetsCounter()
                        {
                          j++
                          console.log(`${j}/${Object.values(assetsJSON.objects).length}`)

                          let timeout = null
                          
                          mainWindow.webContents.send('set-status', `Загрузка ассетов (${j}/${Object.values(assetsJSON.objects).length})`)

                          mainWindow.webContents.send('set-progress', i/Object.values(assetsJSON.objects).length*100)
                          
                          if(j === Object.values(assetsJSON.objects).length-10) {
                            timeout = setTimeout(function() {
                              if (l != 1) {runMinecraft()}
                              l = 1
                              return
                            }, 10000)
                          }

                          if(j === Object.values(assetsJSON.objects).length) {
                            clearTimeout(timeout)
                            if (l != 1) {runMinecraft()}
                            l = 1
                            return
                          }
                        }

                        let values = Object.values(assetsJSON.objects)
                        let keys = Object.keys(assetsJSON.objects)

                        var i = 0;
                        function downloadAsset() {
                          setTimeout(function(){
                            let hash = values[i].hash
                            let hashPrefix = hash.substr(0, 2)
                            let assetDir = `${assetsPath}\\objects\\${hashPrefix}`
                            let assetPath = `${assetsPath}\\objects\\${hashPrefix}\\${hash}`

                            if(assetsIndexId != 'legacy' && assetsIndexId != 'pre-1.6')
                            {
                              if (fs.existsSync(assetPath)) {
                                sha1sum(assetPath).then(sum => {
                                  console.log(sum)
                                  console.log(hash)
  
                                  if (sum === hash)
                                  {
                                    console.log('asset already exists')
                                    assetsCounter()
                                  }
                                  else
                                  {
                                    fs.mkdir(assetDir, { recursive: true }, err => {
                                      try {
                                        downloadFile(`https://resources.download.minecraft.net/${hashPrefix}/${hash}`, assetPath, function(status) {
                                          if (status === 'success') {
                                            assetsCounter()
                                          }
                                        })
                                      }
                                      catch (e) { 
                                        console.log('error')
                                      }
                                    })
                                  }
                                })
                              }
                              else
                              {
                                fs.mkdir(assetDir, { recursive: true }, err => {
                                  try {
                                    downloadFile(`https://resources.download.minecraft.net/${hashPrefix}/${hash}`, assetPath, function(status) {
                                      if (status === 'success') {
                                        assetsCounter()
                                      }
                                    })
                                  }
                                  catch (e) { 
                                    console.log('error')
                                  }
                                })
                              }
                            }
                            else if(assetsIndexId === 'legacy') {
                              let assetPath = assetsPath + `\\virtual\\legacy\\${keys[i]}`
                              let createPath = assetPath.split('/')
                              createPath.pop()

                              console.log(assetPath)
                              createPath = createPath.join('\\')
                              console.log(createPath)

                              if (fs.existsSync(assetPath))
                              {
                                sha1sum(assetPath).then(sum => {
                                  if (sum === hash)
                                  {
                                    console.log('hashsum is working')
                                    assetsCounter()
                                  }
                                  else
                                  {
                                    fs.mkdir(createPath, { recursive: true }, err => {
                                      try {
                                        downloadFile(`https://resources.download.minecraft.net/${hashPrefix}/${hash}`, assetPath, function(status) {
                                          if (status === 'success') {
                                            assetsCounter()
                                          }
                                        })
                                      }
                                      catch (e) { 
                                        console.log('error')
                                      }
                                    })
                                  }
                                })
                              }
                              else
                              {
                                fs.mkdir(createPath, { recursive: true }, err => {
                                  try {
                                    downloadFile(`https://resources.download.minecraft.net/${hashPrefix}/${hash}`, assetPath, function(status) {
                                      if (status === 'success') {
                                        assetsCounter()
                                      }
                                    })
                                  }
                                  catch (e) { 
                                    console.log('error')
                                  }
                                })
                              }
                            }
                            else if(assetsIndexId === 'pre-1.6')
                            {
                              let assetPath = assetsPath + `\\virtual\\pre-1.6\\${keys[i]}`
                              let createPath = assetPath.split('/')
                              createPath.pop()

                              console.log(assetPath)
                              createPath = createPath.join('\\')
                              console.log(createPath)

                              // if(keys[i] === 'RE')
                              if(fs.existsSync(assetPath))
                              {
                                sha1sum(assetPath).then(sum => {
                                  if (sum === hash)
                                  {
                                    console.log('hashsum is working')
                                    assetsCounter()
                                  }
                                  else
                                  {
                                    fs.mkdir(createPath, { recursive: true }, err => {
                                      try {
                                        downloadFile(`https://resources.download.minecraft.net/${hashPrefix}/${hash}`, assetPath, function(status) {
                                          if (status === 'success') {
                                            assetsCounter()
                                          }
                                        })
                                      }
                                      catch (e) { 
                                        console.log('error')
                                      }
                                    })
                                  }
                                })
                              }
                              else
                              {
                                fs.mkdir(createPath, { recursive: true }, err => {
                                  try {
                                    downloadFile(`https://resources.download.minecraft.net/${hashPrefix}/${hash}`, assetPath, function(status) {
                                      if (status === 'success') {
                                        assetsCounter()
                                      }
                                    })
                                  }
                                  catch (e) { 
                                    console.log('error')
                                  }
                                })
                              }
                            }

                            i++
                            if(i<Object.values(assetsJSON.objects).length) {
                              if (l===1) {return}
                              downloadAsset()
                            }
                          }, 1)
                        }

                        downloadAsset()
                      }
                    })
                  })
                }
              }
            }
          }
        })
        
        function runMinecraft() {     
          console.log('launching...')    
          mainWindow.webContents.send('set-status', 'Запуск Майнкрафта...') 
          
          if(!pre17w43a)
          {
            if(os === versionJSON.arguments.jvm[0].rules[0].os.name)
            {
              console.log(versionJSON.arguments.jvm[0].rules[0].os.name)
              jvmArguments.push(versionJSON.arguments.jvm[0].value)
            }
            else if (os === versionJSON.arguments.jvm[1].rules[0].os.name) {
              console.log(versionJSON.arguments.jvm[1].rules[0].os.name)
              jvmArguments.push(versionJSON.arguments.jvm[1].value)
            }
      
            if (osVersion.startsWith('10\.'))
            {
              jvmArguments.push(versionJSON.arguments.jvm[2].value[1])
            }
        
            if(arch === 'ia32' || arch === 'x64'){
              jvmArguments.push(versionJSON.arguments.jvm[3].value)
            }
        
            jvmArguments.push(versionJSON.arguments.jvm[4])
            jvmArguments.push(versionJSON.arguments.jvm[5])
            jvmArguments.push(versionJSON.arguments.jvm[6])
            jvmArguments.push(versionJSON.arguments.jvm[7])
        
            jvmArguments = jvmArguments.join(' ')
            gameArguments = gameArguments.join(' ')
        
            let command = `${java_path} ${jvmArguments} ${libraries.join(';')};${jar_path} ${versionJSON.arguments.jvm[8]} ${gameArguments}`.formatUnicorn({natives_directory:natives_directory, launcher_name:launcher_name, launcher_version:launcher_version, classpath:classpath, auth_player_name:auth_player_name, version_name:version_name, game_directory:game_directory, assets_root:assets_root, assets_index_name:asset_index_name, auth_uuid:auth_uuid, auth_access_token:auth_access_token, clientid:clientid, auth_xuid:auth_xuid, user_type:user_type, version_type:version_type})
        
            // command.formatUnicorn()

            console.log(command)
            runCommand(command, null)
          }
          else{
            jvmArguments.push('-Djava.library.path=${natives_directory}')
            jvmArguments.push('-cp')
            libStr = libraries.join(';')
            libStr.replace('/', '\\')

            jvmArguments = jvmArguments.join(' ')
            gameArguments = gameArguments.join(' ')

            console.log(gameArguments)

            if (assetsIndexId === 'pre-1.6')
            {
              game_assets = assetsPath + '\\virtual\\pre-1.6'
            }

            let command = `${java_path} ${jvmArguments} ${libStr};${jar_path} ${versionJSON.mainClass} ${gameArguments}`.formatUnicorn({natives_directory:natives_directory, launcher_name:launcher_name, launcher_version:launcher_version, classpath:classpath, auth_player_name:auth_player_name, version_name:version_name, game_directory:game_directory, assets_root:assets_root, assets_index_name:asset_index_name, auth_uuid:auth_uuid, auth_access_token:auth_access_token, clientid:clientid, auth_xuid:auth_xuid, user_type:user_type, version_type:version_type})
            
            console.log(command)
            runCommand(command, null)
          }
          
          mainWindow.webContents.send('launching-end')
          mainWindow.webContents.send('set-status', '')
          mainWindow.webContents.send('set-progress', 0)
        }
      }
    })
  });

ipcMain.on('check-offline', () => {
  checkInstalled()
})

function checkInstalled() {

  fs.mkdir(versionsPath, { recursive: true }, err => {
    fs.readdir(versionsPath, (err, files) => {
      files.forEach(file => {
        let versionJSONPath = `${versionsPath}\\${file}\\${file}.json`

        if (fs.existsSync(versionJSONPath)) {
          let versionJSON = JSON.parse(fs.readFileSync(versionJSONPath))
          let versionID = versionJSON.id

          mainWindow.webContents.send('offline-version', versionID, versionJSONPath);
        }
      });
    })
  })
}
