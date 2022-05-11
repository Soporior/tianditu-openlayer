<template>
  <div class="tools-bar">
    <div class="tool">
      <el-row class="demo-autocomplete text-center">
        <el-col :span="12">
          <el-autocomplete
              v-model="searhKeyword"
              :fetch-suggestions="querySearch"
              :trigger-on-focus="false"
              clearable
              class="inline-input w-50"
              placeholder="输入地点"
              @select="handleSelect"
              size="large"
          />
        </el-col>
      </el-row>
    </div>

    <div class="tool">
      <el-select v-model="drawType" @change="toDraw" class="m-2" placeholder="选择绘图动作" size="large">
        <el-option
            v-for="item in drawOptions"
            :key="item.value"
            :label="item.lable"
            :value="item.value"

        />
      </el-select>
      <el-button size="large" @click="clearDraw">结束绘图</el-button>
      <el-button size="large" @click="resetDrawLayer">重置绘画图层</el-button>
    </div>
    <div class="tool">
      <el-select v-model="measureType" @change="blurer" class="m-2" placeholder="选择测量种类" size="large">
        <el-option
            v-for="item in measureTypes"
            :key="item.value"
            :label="item.lable"
            :value="item.value"

        />
      </el-select>
      <el-button size="large" @click="clearMeasureDraw">结束绘图</el-button>
      <el-button size="large" @click="resetLayer">重置绘画图层</el-button>
    </div>
  </div>
  <div id="map" ref="mapr">

  </div>
  <div id="popup" class="ol-popup">
    <a href="#" id="popup-closer" class="ol-popup-closer"></a>
    <div id="popup-content" class="popup-content"></div>
  </div>
  <div class="change-baseLayer">
    <el-button size="large" @click="changeMap('wx')">卫星</el-button>
    <el-button size="large" @click="changeMap('lw')">路网</el-button>
  </div>
</template>

<script lang="ts">
import locationIcon from '@/assets/location.png'
import {searchPoi,searchPoiAround} from '@/api'
import "ol/ol.css";
import { Map, View,Feature} from "ol";
import { defaults as defaultControls } from "ol/control";
import {unByKey} from 'ol/Observable';
import { Vector } from "ol/layer";

import { OSM, TileArcGISRest , Vector as VectorSource} from "ol/source";
import * as olTransform from 'ol/transform';
import XYZ from "ol/source/XYZ";
import source from "ol/source";
import { VectorSourceEvent } from "ol/source/Vector";
import sourceVector from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import { add } from "ol/coordinate";
import { Polygon, MultiPolygon,Point, LineString} from "ol/geom";
import {Style,Icon,Fill,Stroke,Text,Circle as CircleStyle,} from "ol/style";

import WMTS from 'ol/source/WMTS';
import {get as getProjection} from 'ol/proj';
import {getTopLeft, getWidth} from 'ol/extent';
import WMTSTileGrid from 'ol/tilegrid/WMTS';

//弹窗
import "ol/ol.css";
import { toStringHDMS } from "ol/coordinate";
import TileLayer from "ol/layer/Tile";
import Overlay from "ol/Overlay";
import { fromLonLat, transform, toLonLat } from "ol/proj";
import {getArea, getLength} from 'ol/sphere';

import {defineComponent,ref,onMounted,reactive,toRefs} from 'vue';
const mapr = ref(null);
export default defineComponent({
  name:"map",
  setup(){
    let map
    let draw
    let pointLayer
    let overlay

    const state = reactive({
      drawType:'',
      searhKeyword:'',
      center:[104.06333,30.6598],
      drawOptions:[{value:'Point',lable:'点'},
                   {value:'LineString',lable:'线'},
                   {value:'Polygon',lable:'面'},
                   {value:'Circle',lable:'圆'}],
      measureType:'',
      measureTypes:[ {value:'LineString',lable:'线'},
                    {value:'Polygon',lable:'面'},]
    })
    /**
     * @description: 地图初始化
     * @param {*}
     * @return {*}
     */
    //地图初始化准备
    //加载WMTS数据
    const projection = getProjection('EPSG:4326') || {getExtent(){return [1]}};
    const projectionExtent =  projection.getExtent();
    const size = getWidth(projectionExtent) / 256;
    const resolutions = new Array(19);
    const matrixIds = new Array(19);
    for (let z = 0; z < 19; ++z) {
      // generate resolutions and matrixIds arrays for this WMTS
      resolutions[z] = size / Math.pow(2, z);
      matrixIds[z] = z;
    }
    //底图
    let tian_di_tu_satellite_layer = new TileLayer({
      // title: "天地图卫星影像",
      source: new WMTS({
        url: "http://t0.tianditu.gov.cn/img_c/wmts?tk=2799cb186ab54345e5646f1d067df500",
        projection: 'EPSG:4326',
        layer: 'img',
        matrixSet: 'c',
        format: 'tiles',
        tileGrid: new WMTSTileGrid({
          origin: getTopLeft(projectionExtent),
          resolutions: resolutions,
          matrixIds: matrixIds,
        }),
        style: 'default',
        wrapX: true,
      }),
    });
    let tian_di_tu_road_layer = new TileLayer({
      // title: "天地图路网",
      source: new WMTS({
        url: "http://t0.tianditu.gov.cn/vec_c/wmts?tk=2799cb186ab54345e5646f1d067df500",
        projection: 'EPSG:4326',
        layer: 'vec',
        matrixSet: 'c',
        format: 'tiles',
        tileGrid: new WMTSTileGrid({
          origin: getTopLeft(projectionExtent),
          resolutions: resolutions,
          matrixIds: matrixIds,
        }),
        style: 'default',
        wrapX: true,
      }),
    });
    let tian_di_tu_annotation = new TileLayer({
      // title: "天地图文字标注",
      source: new WMTS({
        url: "http://t0.tianditu.gov.cn/cva_c/wmts?tk=2799cb186ab54345e5646f1d067df500",
        projection: 'EPSG:4326',
        layer: 'cva',
        matrixSet: 'c',
        format: 'tiles',
        tileGrid: new WMTSTileGrid({
          origin: getTopLeft(projectionExtent),
          resolutions: resolutions,
          matrixIds: matrixIds,
        }),
        style: 'default',
        wrapX: true,
      }),
    });
    //地图初始化
    const initMap = () => {
      let target = "map"; //根据元素id来选择容器
      // let tileLayer = [tian_di_tu_road_layer, tian_di_tu_annotation];
      let tileLayer = [tian_di_tu_road_layer ,tian_di_tu_annotation];

      let view = new View({
        projection: "EPSG:4326",
        center: state.center, //地图初始化中心坐标
        zoom: 11,
        //最小级别
        minZoom: 4,
        //最大级别
        maxZoom: 12
      });
      map = new Map({
        target,
        overlays: [],
        layers: tileLayer,
        view,
        controls: defaultControls(),
      });

      // 弹出坐标
      // map.on('singleclick', function(e){
      //
      //   console.log(transform(e.coordinate, 'EPSG:3857', 'EPSG:4326'))
      //
      // })

    }
    //地图操作
    const deleteMap = () => {
      map.removeLayer(tian_di_tu_satellite_layer);
      map.removeLayer(tian_di_tu_road_layer);
      map.removeLayer(tian_di_tu_annotation);
      map.removeLayer(pointLayer);
    };
    const changeMap = (type) => {
      deleteMap();
      if (type === "wx") {
        map.addLayer(tian_di_tu_satellite_layer);
      } else if (type === "lw" ){
        map.addLayer(tian_di_tu_road_layer);
      }
      map.addLayer(tian_di_tu_annotation);
      toDraw()
    };
    const clearType = ()=>{
      state.drawType=''
      state.measureType = ''
    }


    /**
     * @description: 搜索地点部分
     * @param {*}
     * @return {*}
     */
    //地点搜索
    const querySearch = (queryString: string, cb: any) => {
      //extent获取地图视口的范围
      let extent = map.getView().calculateExtent(map.getSize()).map(x=>{return x+''}).toString();
      searchPoi({keyword:queryString,extent:extent})
          .then((res)=>{
            if(res.status===200){
              let results =  res.data.pois
              let pointArr=[{lon:0,lat:0}]
              if (!results){
                cb([])
                return
              }
              results.map(x=>{
                x.value = x.name+'('+x.address+')'
                pointArr.push({lon:x.lonlat.split(' ')[0]*1,lat:x.lonlat.split(' ')[1]*1})
                return x})
              addMarker(pointArr)
              cb(results)
            }
          })

    }
    //撒点
    function addMarker(pointArr:{lon:number,lat:number}[]){
      map.removeLayer(
          pointLayer
      );
      //创建画板
      let sourceArr =  new sourceVector({});
      //处理点位 加上style
      for (let i = 0; i < pointArr.length; i++) {
        //点的坐标信息
        let coordinates = [pointArr[i].lon,pointArr[i].lat];
        let feature = new Feature(new Point(coordinates));
        let markerStyle = new Style({
          image: new Icon({
            opacity: 0.75,
            src: locationIcon,
          }),
        })
        feature.setStyle(markerStyle)
        sourceArr.addFeature(feature);
      }


      //LayerVec /VectorLayer  这两种都可以
      pointLayer = new Vector({
        source: sourceArr,
      })

      //地图添加画板
      map.addLayer(
          pointLayer
      );

    }
    const handleSelect = (item) => {
      let lonlat = item.lonlat.split(' ')
      let content = document.getElementById("popup-content");
      if(content){
        content.innerHTML = `
                <p>${item.name}</p>
                <p>地址：${item.address}</p>
                <p>坐标：${item.lonlat}</p>`;
      }
      overlay.setPosition(lonlat); //把 overlay 显示到指定的 x,y坐标
      
      map.getView().animate({
        center:lonlat ,
        // zoom: 17,
        duration: 1000,
      });
    }
    //弹窗
    function addPopup() {
      // 使用变量存储弹窗所需的 DOM 对象
      let container = document.getElementById("popup");
      let closer = document.getElementById("popup-closer");
      let content = document.getElementById("popup-content");

      // 创建一个弹窗 Overlay 对象
      overlay = new Overlay({
        element: container || undefined, //绑定 Overlay 对象和 DOM 对象的
        autoPan: true, // 定义弹出窗口在边缘点击时候可能不完整 设置自动平移效果
        autoPanAnimation: {
          duration: 250 //自动平移效果的动画时间 9毫秒
        }
      });
      // 将弹窗添加到 map 地图中
      map.addOverlay(overlay);

      /**
       * 添加单击响应函数来处理弹窗动作
       */
      //   map.on("click", function(evt) {
      //     let extent = map.getView().calculateExtent(map.getSize()).map(x=>{return x+''}).toString();
      //     let coordinate = evt.coordinate
      //   // 点击尺 （这里是尺(米)，并不是经纬度）;
      //   searchPoiAround({keyword:state.searhKeyword,extent:extent,pointLonlat:coordinate.toString(',')})
      //       .then(res=>{
      //         console.log(res)
      //       })
      //
      //    if(content){
      //      content.innerHTML = `
      //           <p>你点击了这里：</p>
      //
      //           <p>坐标：</p>X：${coordinate[0]} &nbsp;&nbsp; Y: ${coordinate[1]}`;
      //    }
      //   overlay.setPosition(evt.coordinate); //把 overlay 显示到指定的 x,y坐标
      //
      // });
      /**
       * 为弹窗添加一个响应关闭的函数
       */
      if (closer){
        closer.onclick = function() {
          overlay.setPosition(undefined);
          closer?.blur();
          return false;
        };
      }
    }



    /**
     * @description: 绘制点线面圆
     * @param {*}
     * @return {*}
     */
    //新建画图的矢量图层
    const drawLayer = new Vector({
      source: new sourceVector()
    })
    function addInteraction() {
      let value = state.drawType
      if (value !== 'None') {
        draw = new Draw({
          source: drawLayer.getSource() || undefined,
          type: value
        });
        map.addInteraction(draw);
      }
    }
    const toDraw = ()=>{
    drawLayer &&  map.removeLayer(drawLayer)
      map.addLayer(drawLayer)
      //先移除上一个Interaction
      map.removeInteraction(draw);
      map.removeInteraction(drawToMeasure);
      //再根据typeSelect的值绘制新的Interaction
      addInteraction();
    }
    const resetDrawLayer= ()=>{
      clearType()
      map.removeLayer(drawLayer)
      drawLayer.setSource(
          new sourceVector()
      )
      map.addLayer(drawLayer)
    }
    
    const clearDraw=()=>{
      clearType()
      map.removeLayer(drawLayer)
      map.addLayer(drawLayer)
      //先移除上一个Interaction
      map.removeInteraction(draw);
    }




    
    
    
    
    
    /**
     * @description: 测距测面
     * @param {*}
     * @return {*}
     */    
    
    let measureOnchange
    let drawToMeasure; // global so we can remove it later
    

    let source = new VectorSource();
    let vector = new Vector ({
      source: source,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.8)',
        }),
        stroke: new Stroke({
          color: '#138EE87F',
          width: 2,
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: '#138EE87F',
          }),
        }),
      }),
    });

    /**
     * Currently drawn feature.
     * @type {import("../src/ol/Feature.js").default}
     */
    let sketch;

    /**
     * The help tooltip element.
     * @type {HTMLElement}
     */
    let helpTooltipElement;

    /**
     * Overlay to show the help messages.
     * @type {Overlay}
     */
    let helpTooltip;

    /**
     * The measure tooltip element.
     * @type {HTMLElement}
     */
    let measureTooltipElement;

    /**
     * Overlay to show the measurement.
     * @type {Overlay}
     */
    let measureTooltip;
    let measureTooltips:any[]=[]
    /**
     * Message to show when the user is drawing a polygon.
     * @type {string}
     */
    const continuePolygonMsg = '点击继续绘制面';

    /**
     * Message to show when the user is drawing a line.
     * @type {string}
     */
    const continueLineMsg = '点击继续绘制线';

    /**
     * Handle pointer move.
     * @param {import("../src/ol/MapBrowserEvent").default} evt The event.
     */
    const  resetLayer =()=>{
      clearType()
       map.un('pointermove', pointerMoveHandler);
       measureTooltip.setPosition(undefined);
       while(measureTooltips.length>0){
           map.removeOverlay(measureTooltips.shift())
       }
        map.removeOverlay(helpTooltip)
        clearMeasureDraw()
        map.removeLayer(vector)
      

      source = new VectorSource();
      vector = new Vector ({
        source: source,
        style: new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
          stroke: new Stroke({
            color: '#138EE87F',
            width: 2,
          }),
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({
              color: '#138EE87F',
            }),
          }),
        }),
      });
    }
     const pointerMoveHandler = function (evt) {
       if (evt.dragging) {
         return;
       }
       /** @type {string} */
       let helpMsg = '点击开始绘制';

       if (sketch) {
         const geom = sketch.getGeometry();
         if (geom instanceof Polygon) {
           helpMsg = continuePolygonMsg;
         } else if (geom instanceof LineString) {
           helpMsg = continueLineMsg;
         }
       }

       helpTooltipElement.innerHTML = helpMsg;
       helpTooltip.setPosition(evt.coordinate);

       helpTooltipElement.classList.remove('hidden');
     };

     /**
      * Format length output.
      * @param {LineString} line The line.z
      * @return {string} The formatted length.
      */

     const formatLength = function (line) {
       const length = getLength(line, {projection:'EPSG:4326'});
       let output;
       if (length > 100) {
         output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
       } else {
         output = Math.round(length * 100) / 100 + ' ' + 'm';
       }
       return output;
     };

     /**
      * Format area output.
      * @param {Polygon} polygon The polygon.
      * @return {string} Formatted area.
      */
     const formatArea = function (polygon) {
       const area = getArea(polygon,{projection:'EPSG:4326'});
       let output;
       if (area > 10000) {
         output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
       } else {
         output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
       }
       return output;
     };
       function createHelpTooltip() {
       if (helpTooltipElement) {
         helpTooltipElement.parentNode.removeChild(helpTooltipElement);
       }
       helpTooltipElement = document.createElement('div');
       helpTooltipElement.className = 'ol-tooltip hidden';
       helpTooltip = new Overlay({
         element: helpTooltipElement,
         offset: [15, 0],
         positioning: 'center-left',
       });
       map.addOverlay(helpTooltip);
     }

     /**
      * Creates a new measure tooltip
      */
     function createMeasureTooltip() {
       if (measureTooltipElement) {
         measureTooltipElement.parentNode.removeChild(measureTooltipElement);
       }
       measureTooltipElement = document.createElement('div');
       measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
       measureTooltip = new Overlay({
         element: measureTooltipElement,
         offset: [0, -15],
         positioning: 'bottom-center',
         stopEvent: false,
         insertFirst: false,
       });
       measureTooltips.push(measureTooltip)
       map.addOverlay(measureTooltip);
     }
      function addInteractionToMeasure() {
       drawToMeasure = new Draw({
         source: source,
         type: state.measureType,
         style: new Style({
           fill: new Fill({
             color: 'rgba(255, 255, 255, 0.2)',
           }),
           stroke: new Stroke({
             color: 'rgba(0, 0, 0, 0.5)',
             lineDash: [10, 10],
             width: 2,
           }),
           image: new CircleStyle({
             radius: 5,
             stroke: new Stroke({
               color: 'rgba(0, 0, 0, 0.7)',
             }),
             fill: new Fill({
               color: 'rgba(255, 255, 255, 0.2)',
             }),
           }),
         }),
       });
       map.addInteraction(drawToMeasure);

       createMeasureTooltip();
       createHelpTooltip();
       map.on('pointermove', pointerMoveHandler);
      map.getViewport().addEventListener('mouseout', function () {
            helpTooltipElement.classList?.add('hidden');
          });

       let listener;
       drawToMeasure.on('drawstart', function (evt) {
         // set sketch
         sketch = evt.feature;

         /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
         let tooltipCoord = evt.coordinate;

         listener = sketch.getGeometry().on('change', function (evt) {
           const geom = evt.target;
           let output;
           if (geom instanceof Polygon) {
             output = formatArea(geom);
             tooltipCoord = geom.getInteriorPoint().getCoordinates();
           } else if (geom instanceof LineString) {
             output = formatLength(geom);
             tooltipCoord = geom.getLastCoordinate();
           }

           measureTooltipElement.innerHTML = output;
           measureTooltip.setPosition(tooltipCoord);
         });
       });

       drawToMeasure.on('drawend', function () {
         measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
         measureTooltip.setOffset([0, -7]);
         // unset sketch
         sketch = null;
         // unset tooltip so that a new one can be created
         measureTooltipElement = null;
         createMeasureTooltip();
         unByKey(listener);
       });
     }
    measureOnchange = function(){
      //  清除画图的画图动作
       measureTool()
       
       map.removeInteraction(drawToMeasure);
       addInteractionToMeasure();
     };
   function measureTool(){
    
     map.removeLayer(vector)
     map.addLayer(vector)
   }
    function clearMeasureDraw(){
      clearType()
      map.removeInteraction(drawToMeasure)
    }
        


    function blurer(){
    
      measureOnchange()
      

    }
    onMounted(() => {
      initMap();
      addPopup()
      

    });
    return{
      ...toRefs(state),
      changeMap,
      toDraw,
      resetDrawLayer,
      handleSelect,
      querySearch,
      clearDraw,
      blurer,
      resetLayer,
      clearMeasureDraw
    }
  }
})
</script>
<style>
#map {
width: 100%;
height: 500px;
}
.tools-bar{
height: 30px;
margin-left: 60px;
}
.tool{
float: left;
width: 582px;
}
.change-baseLayer{
  position: absolute;
  bottom: 10px;
  right: 10px;
}
.ol-popup {
  position: absolute;
  background-color: white;
  -webkit-filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.2));
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.2));
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #cccccc;
  bottom: 12px;
  left: -50px;
}
.ol-popup:after,
.ol-popup:before {
  top: 100%;
  border: solid transparent;
  content: " ";
  height: 0;
  width: 0;
  position: absolute;
  pointer-events: none;
}
.ol-popup:after {
  border-top-color: white;
  border-width: 10px;
  left: 48px;
  margin-left: -10px;
}
.ol-popup:before {
  border-top-color: #cccccc;
  border-width: 11px;
  left: 48px;
  margin-left: -11px;
}
.ol-popup-closer {
  text-decoration: none;
  position: absolute;
  top: 2px;
  right: 8px;
}
.popup-content {
  width: 400px;
}
.ol-popup-closer:after {
  content: "✖";
}
.search-board{
  width: 163px;
  height: 400px;
  position: absolute;
  z-index: 999;
  top: 150px;
  left: 23px;
}



.ol-tooltip {
  position: relative;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  color: white;
  padding: 4px 8px;
  opacity: 0.7;
  white-space: nowrap;
  font-size: 12px;
  cursor: default;
  user-select: none;
}
.ol-tooltip-measure {
  opacity: 1;
  font-weight: bold;
}
.ol-tooltip-static {
  background-color: #ffcc33;
  color: black;
  border: 1px solid white;
}
.ol-tooltip-measure:before,
.ol-tooltip-static:before {
  border-top: 6px solid rgba(0, 0, 0, 0.5);
  border-right: 6px solid transparent;
  border-left: 6px solid transparent;
  content: "";
  position: absolute;
  bottom: -6px;
  margin-left: -7px;
  left: 50%;
}
.ol-tooltip-static:before {
  border-top-color: #ffcc33;
}
</style>
