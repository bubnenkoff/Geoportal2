function drawmap(imageUrl, imageBounds)
{
    
   var cities = new L.LayerGroup();

    var mbAttr = '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ',
    mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw';

    var grayscale  = L.tileLayer(mbUrl, {id: 'mapbox.light', attribution: mbAttr}),
      streets  = L.tileLayer(mbUrl, {id: 'mapbox.streets',   attribution: mbAttr});

    Window.map = L.map('map', {
      center: [49, 20],
      zoom: 3,
      minZoom: 2,
      zoomSnap: 0,
      layers: [grayscale, cities],
      measureControl: true
    });

var drawnItems = new L.FeatureGroup();
Window.map.addLayer(drawnItems);


// example of calling ouside function: userContent.options.methods.foo()

var drawControl = new L.Control.Draw({
    draw: {
        position: 'topleft',
        polyline: {
            guidelineDistance: 10,
            shapeOptions: {
                color: '#FF5500',
                opacity: 1,
                weight: 2
            }
        },
        polygon: true,
        rectangle: false,
        polyline: false,
        circle: true,
        marker: false
    },

    // edit: {
    //     featureGroup: drawnItems
    // },



});



Window.map.addControl(drawControl);

//add to map
Window.map.on('draw:created', function (e) {
    var type = e.layerType,
        layer = e.layer;
        drawnItems.clearLayers(); // очитка от предыдущих полигонов
      
        drawnItems.addLayer(layer);

      App.$refs.userContent.rasters_layers_list.forEach(function(rstr, i) // в момент рисования удаляем все старые отрисованные растры
      {
        Window.map.removeLayer(rstr);
        console.log(rstr);
        App.$refs.userContent.rasters_imgs_list.splice(i, 1); // удаляем из таблицы слоев
      });

      var geojson = e.layer.toGeoJSON();
      var wkt = Terraformer.WKT.convert(geojson.geometry);


      var request_type = "rasters_previews";
      var hours_start; // часы которые к указанной дате добавляем
      var hours_end; // ditto

      var minutes_start;
      var minutes_end;

      if(!!App.$refs.userContent.img_starttime)
      {
        hours_start = App.$refs.userContent.img_starttime.split(":")[0];  
        minutes_start = App.$refs.userContent.img_starttime.split(":")[1];  
      }
      
      if(!!App.$refs.userContent.img_endtime)
      {
        hours_end = App.$refs.userContent.img_endtime.split(":")[0]; 
        minutes_end = App.$refs.userContent.img_endtime.split(":")[1];  
      }
      
      var startdate = moment(App.$refs.userContent.img_startdate).add(hours_start, 'hours').add(minutes_start, 'minutes').format();
      var enddate = moment(App.$refs.userContent.img_enddate).add(hours_end, 'hours').add(minutes_end, 'minutes').format();
      var coordinates = wkt

      console.log("startdate: ", startdate);

      var types = [];
      // Вычисляем тип выбранных снимоков:
      if(App.$refs.userContent.img_vis)
        types.push("vis");

      if(App.$refs.userContent.img_ir)
        types.push("ir");

      if(App.$refs.userContent.img_rgb)
        types.push("rgb");

      if(App.$refs.userContent.img_enh)
        types.push("enh"); 

      // к дате начала и конца нужно прибавить часы и минуты из соответсвующих полей


      var DataBody = {
        "request_type": request_type,
        "startdate" : startdate,
        "enddate" : enddate,
        "coordinates" : coordinates,
        "types" : types
      };



    // Send WKT to server
   Vue.http.post('/dbdata', DataBody).then((response) => {     

      App.$refs.userContent.rasters_layers_list = []; // сбрасываем индекс всех значений который были до этого. Иначе удаление после повторной отрисовки глючит
      Vue.set(App.$refs.userContent, 'rasters_imgs_list', response.data); // у каждого массива данных есть поле id
      // console.log("response.data: ", response.data); 

      console.log("App.$refs.userContent.rasters_imgs_list: ", App.$refs.userContent.rasters_imgs_list);

      userContent.options.methods.addRastersToMap() // вызывает функцию которая ходит по массиву App.$refs.userContent.rasters_imgs_list и добавляет из него данные на карту и уже в ней таблицу контента формируем

      }, (response) => {
          console.log("Can't get list rasters metadata from DB. Server error: ", response.status)
      });



    // Do whatever else you need to. (save to db, add to map etc)
    // map.addLayer(layer);


       // layer.on('mouseover', function() 
       // {
       //      // alert(layer.getLatLngs());
       //      var geojson = e.layer.toGeoJSON();
       //      var wkt = Terraformer.WKT.convert(geojson.geometry);
       //      console.log(wkt); 
       //      console.log("Hello World"); 
           

       //  });   



});



}    


function x()
{
  console.log("xxx");
}


function getBaseMapLayerList() // After user login we should add base map components
{
  console.log("Loading Base Map Components...");
  var request_type = "base_map_vector_layers_names"; // get id и name

  var RequestBody = {
      "request_type": request_type
    };

    return Vue.http.post('/dbdata', RequestBody).then(function (response) {
      console.log("server response code: ", response.status)
      if(response.status == 200)
      {
        console.log("Available Layers:");
        console.log(response.data);
        for(obj of response.data) // перебираем объекты и дальше пушим имена в список доступных слое // Наверно можно было бы и без пеерборки сделать
        {
           App.$refs.userContent.base_map_vector_layers_list_names.push(obj); // лучше работать не с именами, а с массивом объектов. Поэтому кладем весь объект
        }

      }

      else
        console.log("[ERROR] Can't get list of BaseMap layers"); 
  });

}



function getBaseMapByLayerIdContent(layer_id) // получаем конкретный слой
{
  console.log("Loading Base Map Components...");
  var request_type = "particular_layer";

  var RequestBody = {
      "request_type": request_type,
      "layer_id" : layer_id
    };

    return Vue.http.post('/dbdata', RequestBody);
}


function RequestEQ()
{
  console.log("Loading EQ...");
  
  var eq_startdate = moment(App.$refs.userContent.eq_startdate).format();
  var eq_enddate = moment(App.$refs.userContent.eq_enddate).format();

    var EQDataBody = {
      "request_type": "EQ",
      "magnitude" : App.$refs.userContent.magnitude_value,
      "startdate" : eq_startdate,
      "enddate" : eq_enddate,
    };

     return Vue.http.post('/dbdata', EQDataBody);
}