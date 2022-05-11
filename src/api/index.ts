// import instance from "axios";
import axios from 'axios'

let baseURL = "";
let key = '2799cb186ab54345e5646f1d067df500'

export const searchPoi=({keyword,extent}:{keyword:string,extent:string})=>{
  return axios({
    url:`http://api.tianditu.gov.cn/search?postStr={"keyWord":"${keyword}","level":"15","mapBound":"${extent}","queryType":"2","count":"20","start":"0"}&type=query&tk=${key}`,
    method:'get'
  });
}
export const searchPoiAround=({keyword,extent,pointLonlat}:{keyword:string,extent:string,pointLonlat:string})=>{
  return axios({
    url:`http://api.tianditu.gov.cn/search?postStr={"keyWord":"${keyword}","level":"15","mapBound":"${extent}","queryType":"3","pointLonlat":"${pointLonlat}","queryRadius":"1000","count":"20","start":"0"}&type=query&tk=${key}`,
    method:'get'
  });
}

