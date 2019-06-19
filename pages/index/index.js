//index.js
//获取应用实例
const app = getApp();
const util = require('../../utils/util.js');
const { $Message } = require('../../dist/base/index');

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    tabsData: [],
    currentTab: {
      type: 'lamp',
      index: 0
    },
    listSpinShow: true,
    listData: [],
    autoIsOpen: false,
    navScrollLeft: 0
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function() {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }

    wx.getSystemInfo({
      success: (res) => {
        //x以上系列适配，没做
        let modelmes = res.model;
        if (modelmes.search('iPhone X') != -1) {
          this.setData({
            isIphoneX: true
          })
        }
        this.setData({
          windowHeight: res.windowHeight,
          windowWidth: res.windowWidth
        })
      },
    })

    wx.request({
      url: app.baseUrl + 'DeviceController/getAllDeviceType',
      method: 'POST',
      dataType: 'json',
      data: {},
      success: res => {
        console.log(res.data);
        this.setData({
          tabsData: res.data,
          currentTab: {
            type: res.data[0].typeName,
            index: res.data[0].id - 1
          }
        })
        wx.request({
          url: app.baseUrl + 'DeviceController/getDeviceByType',
          method: 'POST',
          data: {
            type: this.data.currentTab.type
          },
          dataType: 'json',
          success: res => {
            console.log(res.data);
            this.setData({
              listSpinShow: false,
              listData: res.data
            })
          }
        })
      }
    })

    this.getTypeByTypeName();

    var interval = setInterval(()=> {
      if(this.data.autoIsOpen==true){
        console.log('interval-autoIsOpen')
        this.setData({
          listSpinShow: true,
        })
        wx.request({
          url: app.baseUrl + 'DeviceController/getDeviceByType',
          method: 'POST',
          data: {
            type: this.data.currentTab.type
          },
          dataType: 'json',
          success: res => {
            console.log(res.data);
            this.setData({
              listSpinShow: false,
              listData: res.data
            });
            if (this.data.currentTab.type =='smokeDetector'&&res.data[0].isOpen==1){
              wx.request({
                url: app.baseUrl + 'QuartzManagerSurroundings/getNewestSurrounding',
                method: 'POST',
                dataType: 'json',
                data: {},
                success: res => {
                  console.log(res.data);
                  if(res.data.smoke>=20){
                    $Message({
                      content: '警报！烟雾浓度过高！',
                      type: 'warning',
                      duration: 5
                    });
                  }
                }
              })
            } else if (this.data.currentTab.type == 'camera' && res.data[0].lazyNum > 0 && res.data[0].isOpen==1){
              $Message({
                content: '报告老师！有' + res.data[0].lazyNum+'个同学没有认真听课！',
                duration: 5
              });
            }
          }
        })
      }
    }, 5000) //循环间隔 单位ms

  },

  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },

  getTypeByTypeName: function() {
    wx.request({
      url: app.baseUrl + 'TypeController/getTypeByTypeName',
      method: 'POST',
      dataType: 'json',
      data: {
        typeName: this.data.currentTab.type
      },
      success: res => {
        console.log(res.data);
        this.setData({
          autoIsOpen: res.data.autoIsOpen
        })
      }
    })
  },

  switchTab: util.throttle(function(event) {
    this.setData({
      listSpinShow: true
    })
    console.log(event);
    let cur;
    if (event.currentTarget.dataset.type == 0) {
      cur = event.currentTarget.dataset.current;
    } else if (event.currentTarget.dataset.type == 1) {
      cur = this.data.tabsData[event.detail.current];
    }
    let singleNavWidth = this.data.windowWidth / 5;
    console.log(cur);
    this.setData({
      currentTab: {
        type: cur.typeName,
        index: cur.id - 1
      },
      navScrollLeft: (cur.id - 3) * singleNavWidth,
    });

    wx.request({
      url: app.baseUrl + 'DeviceController/getDeviceByType',
      method: 'POST',
      data: {
        type: cur.typeName
      },
      dataType: 'json',
      success: res => {
        console.log(res.data);
        this.setData({
          listSpinShow: false,
          listData: res.data
        })
      }
    })
    this.getTypeByTypeName(this.data.currentTab.type)
  }, 300),

  afterOperating: function() {
    this.setData({
      listSpinShow: true
    });
    wx.request({
      url: app.baseUrl + 'DeviceController/getDeviceByType',
      method: 'POST',
      data: {
        type: this.data.currentTab.type
      },
      dataType: 'json',
      success: res => {
        this.setData({
          listSpinShow: false,
          listData: res.data
        })
      }
    })
  },

  deviceSwitch: function(e) {
    // console.log(e)
    let data = e.currentTarget.dataset;
    let onOrOff = (data.switch+1) % 2; //+1除以2取余数即可得到isOpen的数字属性，而不是boolean
    let id = data.id;
    let type = data.type;

    wx.request({
      url: app.baseUrl + 'DeviceController/updateDeviceIsOpenById',
      method: 'POST',
      data: {
        id: id,
        isOpen: onOrOff,
        type: type
      },
      dataType: 'json',
      success: res => {
        if (res.data == "success") {
          this.afterOperating();
        }
      }
    })

  },

  windowCoverChange: function(e) {
    //console.log('windowCoverChange',e);
    let data = e.currentTarget.dataset;
    let id = data.id;
    let value = e.detail.value;

    this.setData({
      listSpinShow: true
    });
    wx.request({
      url: app.baseUrl + 'DeviceController/setWindowCoverPercent',
      method: 'POST',
      data: {
        id: id,
        coverPercent: value
      },
      dataType: 'json',
      success: res => {
        this.afterOperating();
      }
    })
  },

  curtainCoverChange: function(e) {
    // console.log(e)
    let data = e.currentTarget.dataset;
    let id = data.id;
    let value = e.detail.value;

    this.setData({
      listSpinShow: true
    });
    wx.request({
      url: app.baseUrl + 'DeviceController/setCurtainCoverPercent',
      method: 'POST',
      data: {
        id: id,
        coverPercent: value
      },
      dataType: 'json',
      success: res => {
        this.afterOperating();
      }
    })
  },

  
  airconditioningTemChange: function(e) {
    console.log('airconditioningTemChange',e)
    let data = e.currentTarget.dataset;
    let id = data.id;
    let value = e.detail.value;
    let isOpen = data.isopen;

    if(isOpen==0){
      $Message({
        content: '请先打开空调再进行温度修改操作！',
      });
    }else{
      this.setData({
        listSpinShow: true
      });
      wx.request({
        url: app.baseUrl + 'DeviceController/setAirconditioningTem',
        method: 'POST',
        data: {
          id: id,
          settingTemperature: value
        },
        dataType: 'json',
        success: res => {
          this.afterOperating();
        }
      })
    }
  },

  autoSwitch: function(e) {
    console.log('autoSwitch',e)
    let data = e.currentTarget.dataset;
    let typeName = data.typename;
    let autoIsOpen = e.detail.value%2;
    this.setData({
      listSpinShow: true
    });
    wx.request({
      url: app.baseUrl + 'TypeController/setTypeByTypeName',
      method: 'POST',
      data: {
        typeName: typeName,
        autoIsOpen: autoIsOpen
      },
      dataType: 'json',
      success: res => {
        wx.request({
          url: app.baseUrl + 'TypeController/getTypeByTypeName',
          method: 'POST',
          dataType: 'json',
          data: {
            typeName: this.data.currentTab.type
          },
          success: res => {
            console.log(res.data);
            this.setData({
              autoIsOpen: res.data.autoIsOpen,
              listSpinShow: false,
            })
          }
        })
      }
    })

  }


});