/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { Component } from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  View,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  ImageBackground,
  Modal,
  PermissionsAndroid,
  BackHandler,
  DeviceEventEmitter,
  ToastAndroid,
  PanResponder
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators, HeaderBackButton } from '@react-navigation/stack';
import RNFS from 'react-native-fs';
import Orientation from 'react-native-orientation-locker';

const { width, height } = Dimensions.get("window");
const statusBarHeight = StatusBar.currentHeight;
const headerHeight = 56;
const pageSize = 20;

class Book extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showDefault: false
    };
  }

  render() {
    const { width, name, path, preview, deleteMode, deleteBookList, chooseDeleteBook, moveToDetail } = this.props;
    return (
      <View style={{ width, paddingLeft: 20 }}>
        <TouchableWithoutFeedback onPress={() => deleteMode ? chooseDeleteBook() : moveToDetail()}>
          {
            this.state.showDefault ?
              <View style={{ height: Math.floor(width * 1.4), backgroundColor: 'grey', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 20 }}>图片加载失败</Text>
                {
                  deleteMode ?
                    <View style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderWidth: 2, backgroundColor: '#fff' }}>
                      {
                        deleteBookList.includes(path) ?
                          <Text style={{ fontSize: 20, lineHeight: 20, textAlign: 'center' }}>√</Text>
                          :
                          null
                      }
                    </View>
                    :
                    null
                }
              </View>
              :
              <ImageBackground
                source={{ uri: `file:///${path}/${preview}` }}
                style={{
                  width: width - 20,
                  height: Math.floor(width * 1.4)
                }}
                resizeMode={"cover"}
                resizeMethod={"resize"}
                onError={() => this.setState({ showDefault: true })}
              >
                {
                  deleteMode ?
                    <View style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderWidth: 2, backgroundColor: '#fff' }}>
                      {
                        deleteBookList.includes(path) ?
                          <Text style={{ fontSize: 20, lineHeight: 20, textAlign: 'center' }}>√</Text>
                          :
                          null
                      }
                    </View>
                    :
                    null
                }
              </ImageBackground>
          }
        </TouchableWithoutFeedback>
        <Text numberOfLines={2} style={{ paddingTop: 5, paddingBottom: 20, fontSize: 18, textAlign: 'center' }}>{name}</Text>
      </View>
    )
  }
}

class HomeScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookWidth: Math.floor((width - 20) / 3),
      bookList: [],
      modalVisible: false,
      path: "",
      pathName: "",
      fileList: [],
      deleteMode: false,
      deleteBookList: [],
      lastDir: ""
    };
    const { navigation } = this.props;
    navigation.setOptions({
      title: '我的书架',
      headerTitleAlign: 'center',
    });
  }

  async componentDidMount() {
    try {
      const granted1 = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      if (granted1 !== PermissionsAndroid.RESULTS.GRANTED) {
        BackHandler.exitApp();
        return;
      }
      const granted2 = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      if (granted2 !== PermissionsAndroid.RESULTS.GRANTED) {
        BackHandler.exitApp();
        return;
      }
      const isListFileExist = await RNFS.exists(`${RNFS.DocumentDirectoryPath}/allbook.list`);
      if (!isListFileExist) {
        await RNFS.write(`${RNFS.DocumentDirectoryPath}/allbook.list`, '', 0);
      }
      this.getBookList();
      this.refreshSubScription = DeviceEventEmitter.addListener('refresh', () => {
        this.getBookList();
      });
      const isLastDirFileExist = await RNFS.exists(`${RNFS.DocumentDirectoryPath}/last.dir`);
      if (!isLastDirFileExist) {
        await RNFS.write(`${RNFS.DocumentDirectoryPath}/last.dir`, RNFS.ExternalStorageDirectoryPath, 0);
      }
      this.getLastDir();
    } catch (error) {
      alert(err)
    }
  }

  componentWillUnmount() {
    this.refreshSubScription.remove();
  }

  getBookList() {
    const { navigation } = this.props;
    RNFS.readFile(`${RNFS.DocumentDirectoryPath}/allbook.list`).then(res => {
      this.setState({
        bookList: res === '' ? [] : res.split('\n\n').map(book => book.split('\n').reduce((total, str) => {
          let [str1, ...str2] = str.split(':');
          return Object.assign(total, { [str1]: str2.join(':') });
        }, {}))
      }, () => {
        if (this.state.bookList.length) {
          navigation.setOptions({
            headerRight: () => (
              <TouchableWithoutFeedback onPress={() => this.deleteStart()}>
                <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20 }}>删除</Text>
              </TouchableWithoutFeedback>
            ),
          });
        } else {
          navigation.setOptions({
            headerRight: () => null,
          });
        }
      });
    }).catch(() => { });
  }

  getLastDir() {
    RNFS.readFile(`${RNFS.DocumentDirectoryPath}/last.dir`).then(res => {
      this.setState({ lastDir: res });
    }).catch(() => { });
  }

  importFile() {
    this.enterDir(this.state.lastDir, true);
  }

  enterDir(path, firstFlag, backFlag) {
    let pathName = '';
    if (firstFlag) {
      pathName = `主目录${path.substring(RNFS.ExternalStorageDirectoryPath.length)}`;
    } else if (backFlag) {
      path = this.state.path.substring(0, this.state.path.lastIndexOf('/'));
      pathName = this.state.pathName.substring(0, this.state.pathName.lastIndexOf('/'));
    } else {
      pathName = `${this.state.pathName}/${path}`;
      path = `${this.state.path}/${path}`;
    }
    RNFS.unlink(`${RNFS.DocumentDirectoryPath}/last.dir`).then(() => {
      RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/last.dir`, path).then(() => {
        this.setState({ lastDir: path });
      }).catch(() => { });
    }).catch(() => { });
    RNFS.readDir(path).then(res => {
      this.setState({
        modalVisible: true,
        path,
        pathName,
        fileList: res.map(file => {
          return {
            name: file.name,
            isFile: file.isFile()
          }
        }).sort((a, b) => a.name > b.name)
      });
    }).catch(err => {
      alert(err);
    })
  }

  clickFile(file) {
    if (!file.isFile) {
      this.enterDir(file.name);
    } else if (['png', 'jpg', 'jpeg', 'gif', 'jfif'].includes(file.name.substring(file.name.lastIndexOf('.') + 1))) {
      RNFS.readFile(`${RNFS.DocumentDirectoryPath}/allbook.list`).then(res => {
        const bookList = res === '' ? [] : res.split('\n\n').map(book => book.split('\n'));
        const bookIndex = bookList.findIndex(book => book[2] === `path:${this.state.path}`);
        const picList = this.state.fileList.filter(file => file.name.lastIndexOf('.') > -1 && ['png', 'jpg', 'jpeg', 'gif', 'jfif'].includes(file.name.substring(file.name.lastIndexOf('.') + 1)));
        picList.sort((a, b) => (a.name.substring(0, a.name.lastIndexOf('.')).replace(/^.*?(\d+)$/, '$1') - 0) - (b.name.substring(0, b.name.lastIndexOf('.')).replace(/^.*?(\d+)$/, '$1') - 0));
        const book = [
          `bookname:${this.state.path.split('/').pop()}`,
          `preview:${picList[0].name}`,
          `path:${this.state.path}`,
          `bookmark:${file.name}`,
        ];
        if (bookIndex > -1) {
          bookList[bookIndex] = book;
        } else {
          bookList.push(book)
        }
        RNFS.unlink(`${RNFS.DocumentDirectoryPath}/allbook.list`).then(() => {
          RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/allbook.list`, bookList.map(book => book.join('\n')).join('\n\n')).then(() => {
            this.setState({
              modalVisible: false
            }, () => {
              const { navigation } = this.props;
              navigation.navigate('Details', { path: this.state.path, bookmark: file.name });
            });
          }).catch(() => { });
        }).catch(() => { });
      }).catch(() => { });
    }
  }

  cancel() {
    this.setState({
      modalVisible: false
    });
  }

  finish() {
    const picList = this.state.fileList.filter(file => file.name.lastIndexOf('.') > -1 && ['png', 'jpg', 'jpeg', 'gif', 'jfif'].includes(file.name.substring(file.name.lastIndexOf('.') + 1)));
    if (picList.length) {
      RNFS.readFile(`${RNFS.DocumentDirectoryPath}/allbook.list`).then(res => {
        const bookList = res === '' ? [] : res.split('\n\n').map(book => book.split('\n'));
        const bookIndex = bookList.findIndex(book => book[2] === `path:${this.state.path}`);
        picList.sort((a, b) => (a.name.substring(0, a.name.lastIndexOf('.')).replace(/^.*?(\d+)$/, '$1') - 0) - (b.name.substring(0, b.name.lastIndexOf('.')).replace(/^.*?(\d+)$/, '$1') - 0));
        const book = [
          `bookname:${this.state.path.split('/').pop()}`,
          `preview:${picList[0].name}`,
          `path:${this.state.path}`,
          `bookmark:${picList[0].name}`,
        ];
        if (bookIndex > -1) {
          bookList[bookIndex] = book;
        } else {
          bookList.push(book)
        }
        RNFS.unlink(`${RNFS.DocumentDirectoryPath}/allbook.list`).then(() => {
          RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/allbook.list`, bookList.map(book => book.join('\n')).join('\n\n')).then(() => {
            this.setState({
              modalVisible: false
            }, () => {
              alert('导入成功!');
              this.getBookList();
            });
          }).catch(() => { });
        }).catch(() => { });
      }).catch(() => { });
    } else {
      alert('该目录下没有图片!');
    }
  }

  exitDir() {
    if (this.state.pathName.includes('/')) {
      this.enterDir('', false, true);
    } else {
      this.setState({
        modalVisible: false
      });
    }
  }

  moveToDetail(book) {
    const { navigation } = this.props;
    navigation.navigate('Details', { path: book.path, bookmark: book.bookmark });
  }

  deleteStart() {
    const { navigation } = this.props;
    navigation.setOptions({
      headerRight: () => (
        <TouchableWithoutFeedback onPress={() => this.deleteFinish()}>
          <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20 }}>完成</Text>
        </TouchableWithoutFeedback>
      ),
    });
    this.setState({
      deleteMode: true
    });
  }

  chooseDeleteBook(book) {
    const { deleteBookList } = this.state;
    if (deleteBookList.includes(book.path)) {
      deleteBookList.splice(deleteBookList.indexOf(book.path), 1);
    } else {
      deleteBookList.push(book.path);
    }
    this.setState({
      deleteBookList
    });
  }

  deleteFinish() {
    if (!this.state.deleteBookList.length) {
      this.setState({
        deleteMode: false
      }, () => {
        const { navigation } = this.props;
        if (this.state.bookList.length) {
          navigation.setOptions({
            headerRight: () => (
              <TouchableWithoutFeedback onPress={() => this.deleteStart()}>
                <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20 }}>删除</Text>
              </TouchableWithoutFeedback>
            ),
          });
        } else {
          navigation.setOptions({
            headerRight: () => null,
          });
        }
      });
      return;
    }
    const bookList = this.state.bookList.filter(book => !this.state.deleteBookList.includes(book.path)).map(book => {
      return [
        `bookname:${book.bookname}`,
        `preview:${book.preview}`,
        `path:${book.path}`,
        `bookmark:${book.bookmark}`
      ]
    })
    RNFS.unlink(`${RNFS.DocumentDirectoryPath}/allbook.list`).then(() => {
      RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/allbook.list`, bookList.map(book => book.join('\n')).join('\n\n')).then(() => {
        this.setState({
          deleteMode: false,
          deleteBookList: []
        }, () => {
          alert('删除成功!');
          this.getBookList();
        });
      }).catch(() => { });
    }).catch(() => { });
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView>
          <View style={{ flex: 1, paddingVertical: 20, flexDirection: 'row', flexWrap: 'wrap' }}>
            {
              this.state.bookList.length ?
                this.state.bookList.map(book => <Book key={book.path} name={book.bookname} preview={book.preview} path={book.path} width={this.state.bookWidth} deleteMode={this.state.deleteMode} deleteBookList={this.state.deleteBookList} chooseDeleteBook={() => this.chooseDeleteBook(book)} moveToDetail={() => this.moveToDetail(book)} />)
                :
                null
            }
            {
              !this.state.deleteMode ?
                <View style={{ width: this.state.bookWidth, paddingLeft: 20 }}>
                  <TouchableWithoutFeedback onPress={() => this.importFile()}>
                    <View style={{ height: Math.floor(this.state.bookWidth * 1.4), borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>+ 导入</Text>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
                :
                null
            }
          </View>
        </ScrollView>
        <Modal
          animationType="fade"
          transparent={false}
          visible={this.state.modalVisible}
          onRequestClose={() => { this.exitDir() }}
        >
          <View style={{ width: width, height: height - statusBarHeight }}>
            <View style={{ width: width, height: headerHeight, backgroundColor: '#3d51b4', flexDirection: 'row', alignItems: 'center' }}>
              <TouchableWithoutFeedback onPress={() => { this.exitDir() }}>
                <View style={{ height: headerHeight, paddingLeft: 30, paddingRight: 20, justifyContent: 'center' }}>
                  <Image
                    source={require('./assets/left-arrow.png')}
                    resizeMode={"cover"}
                  />
                </View>
              </TouchableWithoutFeedback>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 20, lineHeight: 24, color: '#fff' }}>{this.state.pathName}</Text>
              <TouchableWithoutFeedback onPress={() => { this.cancel() }}>
                <Text style={{ paddingLeft: 10, paddingRight: 10, fontSize: 20, color: '#fff' }}>取消</Text>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback onPress={() => { this.finish() }}>
                <Text style={{ marginRight: 10, paddingLeft: 10, paddingRight: 10, fontSize: 20, color: '#fff' }}>完成</Text>
              </TouchableWithoutFeedback>
            </View>
            <View style={{ flex: 1, backgroundColor: '#eee' }}>
              {
                this.state.fileList.length
                  ? (
                    <ScrollView>
                      <View style={{ flex: 1 }}>
                        {
                          this.state.fileList.map(file => (
                            <View key={file.name} style={{ height: 117, flexDirection: 'row', alignItems: 'center' }}>
                              <TouchableWithoutFeedback onPress={() => this.clickFile(file)}>
                                <View style={{ flex: 1, height: 47, flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={{ width: 59, height: 47, marginLeft: 30, alignItems: 'center', justifyContent: 'center' }}>
                                    {
                                      file.isFile
                                        ? (<Image
                                          source={require('./assets/file.png')}
                                          resizeMode={"cover"}
                                        />)
                                        : (<Image
                                          source={require('./assets/dir.png')}
                                          resizeMode={"cover"}
                                        />)
                                    }
                                  </View>
                                  <View style={{ flex: 1, height: 47, marginLeft: 30, justifyContent: 'space-between' }}>
                                    <Text numberOfLines={1} style={{ fontSize: 20, color: '#444' }}>{file.name}</Text>
                                    <Text style={{ fontSize: 14, color: '#666' }}>{file.isFile ? '文件' : '目录'}</Text>
                                  </View>
                                </View>
                              </TouchableWithoutFeedback>
                            </View>
                          ))
                        }
                      </View>
                    </ScrollView>
                  )
                  : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Image
                        source={require('./assets/empty.png')}
                        resizeMode={"cover"}
                      />
                      <Text style={{ marginTop: 20, fontSize: 24, color: '#c7c7c7' }}>空目录</Text>
                    </View>
                  )
              }
            </View>
          </View>
        </Modal>
      </View>
    );
  }
}

class DetailsScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      allPic: [],
      picList: [],
      orientation: Orientation.getInitialOrientation(),
      scrollView: null,
      showProgress: false,
      index: 0,
      percent: 0,
      maxWidth: 0
    };
    const { navigation, route } = this.props;
    const { path } = route.params;
    navigation.setOptions({
      title: path.split('/').pop(),
      headerLeft: () => (
        <HeaderBackButton onPress={() => this.backAction()} />
      ),
      headerTitleAlign: 'center',
      headerRight: () => (
        <TouchableWithoutFeedback onPress={() => this.changeOrientation()}>
          <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20 }}>转屏</Text>
        </TouchableWithoutFeedback>
      ),
    });
  }

  panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gestureState) => {
      let percent = Math.min(this.state.maxWidth, Math.max(0, gestureState.moveX - 20)) / this.state.maxWidth;
      this.setState({ percent }, () => {
        let index = Math.floor(percent * this.state.allPic.length);
        this.setIndex(index);
      });
    },
  });

  setIndex(index) {
    let i = this.state.picList.findIndex(pic => pic.index == index);
    if (i > -1) {
      this.state.scrollView.scrollTo({ x: 0, y: this.state.picList.slice(0, i).reduce((total, pic) => total + pic.height * (this.state.orientation == 'PORTRAIT' ? 1 : height / width), 0), animate: true });
    } else if (index < this.state.picList[0].index) {
      this.loadPage(2).then(() => {
        this.setIndex(index);
      });
    } else if (index > this.state.picList[this.state.picList.length - 1].index) {
      this.loadPage(3).then(() => {
        this.setIndex(index);
      });
    }
  }

  _onLayout(event) {
    this.setState({ maxWidth: event.nativeEvent.layout.width });
  }

  _onOrientationDidChange = (orientation) => {
    this.setState({ orientation }, () => {
      let i = this.state.picList.findIndex(pic => pic.index == this.state.index);
      this.state.scrollView.scrollTo({ x: 0, y: this.state.picList.slice(0, i).reduce((total, pic) => total + pic.height * (this.state.orientation == 'PORTRAIT' ? 1 : height / width), 0), animate: false });
    });
  };

  componentDidMount() {
    Orientation.lockToPortrait();
    Orientation.addOrientationListener(this._onOrientationDidChange);
    const { path } = this.props.route.params;
    RNFS.readDir(path).then(res => {
      const picList = res.filter(v => v.isFile() && v.name.lastIndexOf('.') > -1 && ['png', 'jpg', 'jpeg', 'gif', 'jfif'].includes(v.name.substring(v.name.lastIndexOf('.') + 1)));
      picList.sort((a, b) => (a.name.substring(0, a.name.lastIndexOf('.')).replace(/^.*?(\d+)$/, '$1') - 0) - (b.name.substring(0, b.name.lastIndexOf('.')).replace(/^.*?(\d+)$/, '$1') - 0));
      this.setState({
        allPic: picList.map((pic, i) => {
          return {
            index: i,
            name: pic.name,
            url: pic.path
          }
        }),
      }, () => {
        this.loadPage(1);
      });
    }).catch((error) => {
      alert(error)
    });
    this.backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      this.backAction
    );
  }

  toast(text) {
    ToastAndroid.showWithGravity(
      text,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER
    );
  }

  // type: 1初始化，2加载上一页，3加载下一页
  loadPage(type) {
    return new Promise(resolve => {
      const { bookmark } = this.props.route.params;
      let pageNum = 0;
      switch (type) {
        case 1:
          const index = this.state.allPic.findIndex(pic => pic.name === bookmark);
          pageNum = Math.floor(index / pageSize);
          break;
        case 2:
          if (this.state.picList[0].index == 0) {
            this.toast("已经到第一页了！");
            return;
          }
          pageNum = (this.state.picList[0].index / pageSize) - 1;
          break;
        case 3:
          if (this.state.picList[this.state.picList.length - 1].index == this.state.allPic.length - 1) {
            this.toast("已经到最后一页了！");
            return;
          }
          pageNum = (this.state.picList[this.state.picList.length - 1].index + 1) / pageSize;
          break;
      }
      let newPicList = this.state.allPic.slice(pageSize * pageNum, pageSize * (pageNum + 1));
      Promise.all(newPicList.map(pic => this.getImageSize(`file:///${pic.url}`))).then(res => {
        let picList = newPicList.map((pic, i) => {
          return {
            ...pic,
            height: res[i]
          }
        });
        if (type == 2) {
          picList = picList.concat(this.state.picList);
        } else if (type == 3) {
          picList = this.state.picList.concat(picList);
        }
        this.setState({ picList }, () => {
          let index = 0;
          if (type == 1) {
            let i = this.state.picList.findIndex(pic => pic.name === bookmark);
            if (i > -1) {
              index = i;
              this.state.scrollView.scrollTo({ x: 0, y: res.slice(0, i).reduce((total, height) => total + height * (this.state.orientation == 'PORTRAIT' ? 1 : height / width), 0), animate: true });
            }
            this.setState({ index, percent: (index + 1) / this.state.allPic.length });
          } else {
            if (type == 2) {
              let i = this.state.picList.findIndex(pic => pic.index == this.state.index);
              this.state.scrollView.scrollTo({ x: 0, y: this.state.picList.slice(0, i).reduce((total, pic) => total + pic.height * (this.state.orientation == 'PORTRAIT' ? 1 : height / width), 0), animate: false });
            }
            resolve();
          }
        });
      }).catch((err) => { alert(err) });
    })
  }

  componentWillUnmount() {
    Orientation.removeOrientationListener(this._onOrientationDidChange);
    Orientation.lockToPortrait();
    BackHandler.removeEventListener("hardwareBackPress", this.backAction);
  }

  changeOrientation() {
    if (this.state.orientation == 'PORTRAIT') {
      Orientation.lockToLandscape();
    } else {
      Orientation.lockToPortrait();
    }
  }

  backAction = () => {
    const { navigation } = this.props;
    navigation.goBack();
    DeviceEventEmitter.emit('refresh');
    return true;
  }

  getImageSize(url) {
    return new Promise((resolve, reject) => {
      Image.getSize(
        url,
        (srcWidth, srcHeight) => {
          const ratio = Math.min(width / srcWidth, height / srcHeight);
          resolve(srcHeight * ratio);
        },
        err => reject(err)
      );
    });
  }

  onScroll(event) {
    let y = event.nativeEvent.contentOffset.y;
    let layoutHeight = event.nativeEvent.layoutMeasurement.height;
    let contentHeight = event.nativeEvent.contentSize.height;
    let total = 0;
    let index = 0;
    let bookmark = '';
    this.state.picList.some(pic => {
      total += pic.height * (this.state.orientation == 'PORTRAIT' ? 1 : height / width);
      if (total > y) {
        index = pic.index;
        bookmark = pic.name;
        return true;
      }
    })
    if (this.state.showProgress) {
      this.setState({ index });
      this.saveBookMark(bookmark);
    } else {
      this.setState({ index, percent: (index + 1) / this.state.allPic.length });
      if (y == 0) {
        this.loadPage(2);
      } else if (y + layoutHeight == contentHeight) {
        this.loadPage(3);
      }
    }
  }

  onMomentumScrollEnd(y) {
    let total = 0;
    let bookmark = '';
    this.state.picList.some(pic => {
      total += pic.height * (this.state.orientation == 'PORTRAIT' ? 1 : height / width);
      if (total > y) {
        bookmark = pic.name;
        return true;
      }
    })
    this.saveBookMark(bookmark);
  }

  saveBookMark(bookmark) {
    RNFS.readFile(`${RNFS.DocumentDirectoryPath}/allbook.list`).then(res => {
      const bookList = res === '' ? [] : res.split('\n\n').map(book => book.split('\n'));
      const bookIndex = bookList.findIndex(book => book[2] === `path:${this.props.route.params.path}`);
      const book = [
        `bookname:${this.props.route.params.path.split('/').pop()}`,
        `preview:${this.state.allPic[0].name}`,
        `path:${this.props.route.params.path}`,
        `bookmark:${bookmark}`,
      ];
      bookList[bookIndex] = book;
      RNFS.unlink(`${RNFS.DocumentDirectoryPath}/allbook.list`).then(() => {
        RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/allbook.list`, bookList.map(book => book.join('\n')).join('\n\n')).then(() => { }).catch(() => { });
      }).catch(() => { });
    }).catch(() => { });
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ScrollView ref={scrollView => this.setState({ scrollView })} onScroll={event => this.onScroll(event)} onMomentumScrollEnd={event => this.onMomentumScrollEnd(event.nativeEvent.contentOffset.y)}>
            <View style={{ flex: 1 }}>
              {this.state.picList.map(pic =>
                <TouchableWithoutFeedback key={pic.url} onPress={() => this.setState({ showProgress: true })}>
                  <Image
                    source={{ uri: `file:///${pic.url}` }}
                    style={{
                      width: this.state.orientation == 'PORTRAIT' ? width : height,
                      height: pic.height * (this.state.orientation == 'PORTRAIT' ? 1 : height / width)
                    }}
                    resizeMode={"cover"}
                    resizeMethod={"resize"}
                  />
                </TouchableWithoutFeedback>
              )}
            </View>
          </ScrollView>
        </View>
        {
          this.state.showProgress ? (
            <>
              <TouchableWithoutFeedback onPress={() => this.setState({ showProgress: false })}>
                <View style={{ position: 'absolute', zIndex: 1, top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                </View>
              </TouchableWithoutFeedback>
              <View style={{ position: 'absolute', zIndex: 2, right: 0, bottom: 0, left: 0, height: 50, paddingLeft: 20, paddingRight: 20, backgroundColor: 'rgba(0, 0, 0, 0.8)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View {...this.panResponder.panHandlers} style={{ flex: 1, height: 2, padding: 10, marginRight: 20, flexDirection: 'row' }}>
                  <View style={{ flex: 1, height: 2, backgroundColor: 'white' }} onLayout={(e) => { this._onLayout(e) }}></View>
                  <View style={{ position: 'absolute', width: 20, height: 20, top: 0, left: this.state.percent * this.state.maxWidth, borderRadius: 20, backgroundColor: 'white' }}></View>
                </View>
                <Text style={{ fontSize: 18, color: 'white' }}>{this.state.index + 1}/{this.state.allPic.length}</Text>
              </View>
            </>
          ) : null
        }
      </View>
    );
  }
}

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS
      }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
