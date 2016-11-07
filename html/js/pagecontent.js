
var guestContent = Vue.extend({
      template: `

      <!-- <p>Guest content</p> -->
   <div class="row">
              <div class="col-md-1"> <!-- .col-md-8 --> </div>

              <div class="col-md-11">
                  Для доступа к порталу необходимо авторизироваться.<br/>
                  <hr />
                  Доступ к панеле администрирования (пока заглушка):<br/>
                  логин: admin<br/>
                  пароль: 123<br/>
                  <p>
                  Панель пользователя (сама карта):<br/>
                  логин: user<br/>
                  пароль: 123<br/>
              </div>

   </div>  
          `

        }
        );

var userContent = Vue.extend({
       // props: ['rasters_imgs_list'],
      template: `
        <div class="MainContainer">
           <div class="SideMenu">
              
              <div class="SideMenuItem">
                 
                      <!-- Заголовок Раздела Секции меню -->
                     <div class="MenuItemHeadName">Layers</div>
                      
                      <!-- Содержимое Раздела Секции меню -->
                     <div class="LayersMenuSectionContent">
                      <div style="width: 100%; text-align: center;">Base Layers</div>
                          <ul v-for="obj in base_map_vector_layers_list_names">
                              <li><input type="checkbox" @click="EnableDisableVectorLayer(obj.id)"/>{{obj.name}}</li>
                          <ul>  
                      </div>

                      <!-- Заголовок Раздела Секции меню -->
                     <div class="MenuItemHeadName">Instruments</div>
                      
                        <!-- Содержимое Раздела Секции меню -->
                       <div class="InstrumentsMenuSectionContent">
                            <div>
                               <button class="btn btn-default fa fa-play-circle" @click="StartAnimation()">Анимировать</button>
                               <span v-if="rasters_imgs_list.length > 0">
                                   <select v-model="selected_img_src">
                                    <option v-for="m in img_src" v-bind:value="m">
                                      {{ m }}
                                    </option>
                                  </select>
                               </span>

                            </div>
                        </div>
                      

                      <!-- Заголовок Раздела Секции меню -->
                     <div class="MenuItemHeadName">Images Params</div>
                      
                      <!-- Содержимое Раздела Секции меню -->
                     <div class="InstrumentsMenuSectionContent">
                        <div>Диапазон дат:</div>   
                          <div class="calendar">
                                <div class="calendarItem"><input type="date" v-model="img_startdate"> <input type="time" step="900" v-model="img_starttime"></div>
                                <div class="calendarItem"><input type="date" v-model="img_enddate"> <input type="time" step="900" v-model="img_endtime"></div>
                           </div> 

                          <div>Тип изображения:</div>
                          <div class="imgType">
                            <div><input type="checkbox" v-model="img_vis"/>vis</div>
                            <div><input type="checkbox" v-model="img_ir"/>ir</div>
                            <div><input type="checkbox" v-model="img_rgb"/>rgb</div>
                            <div><input type="checkbox" v-model="img_enh"/>enh</div>
                          </div>
                      </div>

                    <!-- Заголовок Раздела Секции меню -->
                     <div class="MenuItemHeadName">Seismo Params</div>
                      
                      <!-- Содержимое Раздела Секции меню -->
                     <div class="InstrumentsMenuSectionContent">
                            <div>Диапазон дат:</div>   
                            <div class="calendar">
                                  <div class="calendarItem"><input type="date" v-model="eq_startdate"></div>
                                  <div class="calendarItem"><input type="date" v-model="eq_enddate"></div>
                             </div> 
                        <div>Магнитуда &GreaterEqual; {{magnitude_value}}</div>
                          <input id="magnitude_slider" type="range" min="1" max="8" v-model="magnitude_value" step="1" />
                         <button style="margin-top: 5px;" class="btn btn-default" @click="EqRequest()">Запросить</button>
                         <div style="width: 100%; text-align: center;" v-if="eq_nodata_flag">Нет данных</div>
                      </div>


                      <!-- Заголовок Раздела Секции меню -->
                     <div class="MenuItemHeadName" @click="order = order * -1">&#9660; Images List &#9650;</div>
                      <!-- Содержимое Раздела Секции меню. Каждая секция тут имеет свои правила отображения -->
                     <div class="LayersMenuSectionContent">
                          <!-- Layers List -->

                              <ul v-for="m in rasters_imgs_list | orderBy 'name' order"> <!-- у каждого массива данных есть поле id -->
                                  <div v-if="m.imgTotalCount != 0">
                                    <li v-if="m.name">{{m.name}} <button v-on:click="removeSingleRasterFromList(m)">X</button> </li> <!-- данный m.id из базы данных v-if="m.name" нужно чтобы отсеить поля где имя нет-->
                                  </div>
                              <ul>

                              <div v-if="m.imgTotalCount == 0">
                                 Нет доступных изображений
                              </div>  
                              
                           
                      </div>


                  </div>

              </div>

          
              <div id="map"></div>
          
        </div>


           </div>



          `,
        data: function ()  {
          return {
            map: false,
            rasters_imgs_list: [], // список загруженных растровых объектов
            rasters_layers_list: [], // список растровых словев в формате leaflet
            base_map_vector_layers_list_names: [], // только имя и ID. Нужно для списка слоев
            Geogrid : [],
            Meridians : [],
            AlreadyLoadedLayersIdOnly : [], // Список доступных на сервере слоев. Заполняется при старте
            LoadedBaseMapLayersContent : [], // полученные с сервера слои в виде объектов. Загружаются по клику на слое
            vector_layers : [], // Добавленные на карту слои (полные их данные) ID из БД
            img_starttime: "", //если время указано, мы прибавим его к img_startdate и img_enddate соотвтественно
            img_endtime: "", // ditto
            img_startdate: new Date((new Date()).valueOf() - 1000*3600*24*3).toISOString().slice(0,10), // дата начала всегда на три дня позади // Заполняем все в mymap.js
            img_enddate: new Date().toISOString().slice(0,10), // текущая дата. Старше чем Сегодня снимков не бывает // просто текущая дата: new Date().toISOString().slice(0,10)
            img_vis : true,
            img_ir : false,
            img_rgb : false,
            img_enh : false,
            order: 1, // для сортировки списка загруженных изображений в легенде
            img_src : [], // в эту переменную будем класть тип притетающих изображений, чтобы потом их можно было на основании этого типа скрывать в выборке/ Переменную заполняем из прилетающих данных
            selected_img_src : "", // текущий выбранный тип изображения для анимации. Переменная выставляется после выбора в меню
            magnitude_value: 4, // магнитуда значение по умолчанию
            eq_layers_list: [], // масисв точечных слоев землетрясений
            eq_startdate: new Date((new Date()).valueOf() - 1000*3600*24*3).toISOString().slice(0,10), // дата начала всегда на три дня позади // Заполняем все в mymap.js
            eq_enddate: new Date().toISOString().slice(0,10), // текущая дата. Старше чем Сегодня снимков не бывает // просто текущая дата: new Date().toISOString().slice(0,10)
            eq_nodata_flag : false, // в интерфейсе нужно как-то сообщить, что данных нет. Другой способ перебирать все слои, но он хуже

          }

          },

          ready: function()
          { 
              //drawmap.call(this)
             drawmap.this;
             drawmap();
             //
            // getBaseMap.this;
              getBaseMapLayerList(); // для начала получим имена и id имеющихся слоев
              

          },

          methods: 
          { 
              removeSingleRasterFromList: function (single_raster) // у каждого растра есть id из БД
              {
                App.$refs.userContent.rasters_imgs_list.forEach(function(item, i) { // удаляем из списка растров прилетевший растр
                  if(single_raster.id == item.id) // делаем переборку и ищем id прилетевшего
                  {
                   // App.$refs.userContent.rasters_imgs_list.splice(item, 1);
                    App.$refs.userContent.rasters_imgs_list.$remove(item);
                   
                    console.log("layer removed from layers list: ", item.id);

                    for(layer of App.$refs.userContent.rasters_layers_list) // теперь нужно удалить из списка слоев. Это отдельный массив получается
                    {
                      if(layer.iterable_num == single_raster.id)
                      {
                         console.log("layer removed from map", layer);
                         Window.map.removeLayer(layer);
                         App.$refs.userContent.rasters_layers_list.$remove(layer);
                      }
                    }
                  }

                });
               

              },

              addRastersToMap : function() // iterate and add all rasters to map
              {

                if(!!App.$refs.userContent.rasters_imgs_list)
                {  
                   App.$refs.userContent.rasters_imgs_list.forEach(function(item) { 
                        // some fields include metadata like imgTotalCount. Skip them
                       if(item.coordinates)
                       {
                         console.log(item.imageBounds);

                         // var ar1 = (item.imageBounds).split(" ");
                         var xbounds = JSON.parse('[' + item.imageBounds + ']');
                         var fullURL = "/files/rasters_previews/" + item.img_src + "_" + item.img_type + "/" + (item.datetime).slice(2, 4) + "/" + (item.datetime).slice(5, 7) + "/" + item.name;
                         console.log("xbounds: ", xbounds);
                         console.log("fullURL: ", fullURL);

                         // layer_item would have type "<ILayer> layer". elements from this list we would use for 
                         var layer_item = L.imageOverlay(fullURL, xbounds).addTo(Window.map);
                             layer_item.iterable_num = item.id; // создаем поле с индексным номером. этот номер нужен для удаления т.к. при изменении порядка сортировки могут быть глюки
                             layer_item.img_src_type = item.img_src + "_" + item.img_type; // записываем тип источника для того, чтобы потом при переборке слоев можно было бы с ним что-то делать
                         App.$refs.userContent.rasters_layers_list.push(layer_item);


                       // попутно заполним для того чтобы дальше можно было фильтровать изображения //http://v1.vuejs.org/guide/forms.html
                        if(item.img_src)
                        {
                          if(!App.$refs.userContent.img_src.includes(item.img_src + "_" + item.img_type))
                          {
                            App.$refs.userContent.img_src.push(item.img_src + "_" + item.img_type);
                          }
                          
                        }



                      }

                      // если ничего не найдно, то в прилетевших данных не будет поля coordinates и значит оно не будет добавлено в переменную
                      // можно было верхнюю проверку на координаты выкинуть, но это может привести к усложнению кода впоследствии
                      // поэтому просто проверим отдельно и добавим в переменную
                      if(item.imgTotalCount === 0)
                      {
                      //  App.$refs.userContent.rasters_layers_list.push(layer_item);
                        console.log("No images in selected region. imgTotalCount: ", item.imgTotalCount);
                      }


                    });
                }

                else
                {
                  console.log("Server return empty response or do not answer");
                }

              },


              addLayer : function(id)
              {

              },

              StartAnimation : function()
              {
                if(App.$refs.userContent.selected_img_src.length > 0)// нужно проверить указано ли значение, иначе не анмировать
                { 
                  if(App.$refs.userContent.rasters_layers_list.length > 0)
                  {
                    var mylist = SEARCHJS.matchArray(App.$refs.userContent.rasters_layers_list,{img_src_type:App.$refs.userContent.selected_img_src}); // содержит отфильтрованные значения в зависимости от выбора пользователя

                    var index = 0
                    var interval = setInterval(()=>{
                    const el = mylist[index] // раньше в mylist было App.$refs.userContent.rasters_layers_list
                    index +=1;
                    console.log(this.selected_img_src.split("_")[0]);
                    console.log(el);
                    el.bringToFront();  
                    
                    if(App.$refs.userContent.rasters_layers_list.length == index)
                    {
                      clearInterval(interval);
                    }
                      
                    }, 1000)
                             
                  }
                }

                else
                {
                  console.log("Please select img_type for animation in menu");
                }

              },

              EnableDisableVectorLayer : function(id)
              {
                /*
                    AlreadyLoadedLayersIdOnly
                    LoadedBaseMapLayersContent
                    vector_layers
                */ 

                if(!App.$refs.userContent.AlreadyLoadedLayersIdOnly.includes(id))
                {
                    getBaseMapByLayerIdContent(id).then(function(response){ // заполняем слоем переменную LoadedBaseMapLayersContent
                    var mydata = response.data[0]; // прилетевшие данные. Почему-то вложенный массив

                    if(!App.$refs.userContent.LoadedBaseMapLayersContent.includes(mydata)) // если данных нет
                    {
                      App.$refs.userContent.AlreadyLoadedLayersIdOnly.push(id); // помечаем что уже загрузили данные
                      var geojson = Terraformer.WKT.parse(mydata.coordinates);
                      
                      var mylayer = L.geoJSON(geojson).addTo(Window.map); // добавляем на карту
                      mylayer.mylayer_id = id; // записываем в слой запрашиваемый ID
                      App.$refs.userContent.vector_layers.push(mylayer);  // Набор векторных слоев

                      // в добавленные данные нужно еще записать mylayer_id чтобы дальше было проще
                      App.$refs.userContent.LoadedBaseMapLayersContent.push(mydata); // получам данные и заполняем
                      console.log("Layer was added to Map. Layer ID: ", mydata.id);

                    }
                    else
                    {
                      console.log("Objects with this ID is already loaded");
                    }

                    });
        
                }


                else // если элемент уже есть, то значит он был включен и нам его надо выключить
                     {
                        for(layer of App.$refs.userContent.vector_layers) // Удаляем слои с типом Leaflet 
                        {
                           if(layer.mylayer_id == id)
                           {
                            Window.map.removeLayer(layer);  // Удаляем из отображения. 
                            App.$refs.userContent.AlreadyLoadedLayersIdOnly.$remove(id); //удаляем слой из списка загруженных

                            App.$refs.userContent.vector_layers.$remove(layer); // удаляем данный слой из списка слоев
                            
                           }
   
                        }

                        for(layer of App.$refs.userContent.LoadedBaseMapLayersContent)
                        {
                          if(layer.id == id)
                          {
                            App.$refs.userContent.LoadedBaseMapLayersContent.$remove(layer);
                          }
                        }
                         // console.log("AlreadyLoadedLayersIdOnly: ", App.$refs.userContent.AlreadyLoadedLayersIdOnly);
                         // console.log("LoadedBaseMapLayersContent: ", App.$refs.userContent.LoadedBaseMapLayersContent);
                         // console.log("vector_layers:", App.$refs.userContent.vector_layers);

                        
                     }
                
              },

              foo : function (id)
              {

              },

                EqRequest : function()
                {
                  App.$refs.userContent.eq_nodata_flag = false;  
                  for(layer of App.$refs.userContent.eq_layers_list) // При каждом новом запросе удаляем слои с типом Leaflet
                    {
                        Window.map.removeLayer(layer);  // Удаляем из отображения. 
                    }

                   RequestEQ().then(function(response){ // заполняем слоем переменную LoadedBaseMapLayersContent

                      var mydata = response.data; // прилетевшие данные.
                      console.log("EQ data: ", mydata);
                      if(mydata.eqTotalCount != 0) // если данных нет возвращается только ОДНО поле
                      {
                        for (eq of mydata)
                        {
                          var geojson = Terraformer.WKT.parse(eq.coordinates); // нам нужно поле геометрия т.к. из него GeoJSON формируется
                          console.log(geojson);
                          console.log("eq.type: ", eq.coordinates);

                            // Перед добавлением на карту стилизуем в зависимости от магнитуды
                              var smallEQ = {
                                  "color": "#f58632",
                                  "fillColor": '#5e070d',
                                  "fillOpacity": 1,
                                  "weight": 5,
                              };

                              var bigEQ = {
                                  "color": "#f53240",
                                  "fillColor": '#5e070d',
                                  "fillOpacity": 1,
                                  "weight": 8,
                              };

                              var ultrabigEQ = {
                                  "color": "#a81a25",
                                  "fillColor": '#5e070d',
                                  "fillOpacity": 1,
                                  "weight": 9,
                              };

                            var x = eq.coordinates.replace(`POINT(`,``).replace(`)`,``).split(` `)[0];
                            var y = eq.coordinates.replace(`POINT(`,``).replace(`)`,``).split(` `)[1];
                          //  var mylayer = L.circle([x, y], 200).addTo(Window.map);
                            console.log("----------");
                            if(eq.magnitude <= 4)
                            {
                              var mylayer = L.circle([x, y], smallEQ).addTo(Window.map).bindPopup('<strong>Магнитуда</strong>: '+ eq.magnitude + '<br><strong>Дата</strong>: ' + eq.date + '</strong><br><strong>Район</strong>: ' + eq.regionname);
                            }

                            if(eq.magnitude > 4 && eq.magnitude < 6)
                            {
                              var mylayer = L.circle([x, y], bigEQ).addTo(Window.map).bindPopup('<strong>Магнитуда</strong>: '+ eq.magnitude + '<br><strong>Дата</strong>: ' + eq.date + '</strong><br><strong>Район</strong>: ' + eq.regionname);
                            }
                            if(eq.magnitude >= 6)
                            {
                              var mylayer = L.circle([x, y], ultrabigEQ).addTo(Window.map).bindPopup('<strong>Магнитуда</strong>: '+ eq.magnitude + '<br><strong>Дата</strong>: ' + eq.date + '</strong><br><strong>Район</strong>: ' + eq.regionname);
                            }

                          mylayer.mylayer_id = eq.id; // записываем в слой id который есть который равен id из БД. Чтобы была возможность их потом сопоставлять
                          mylayer.mylayer_id = eq.magnitude; // магнитуда в поле слоя нам тоже пригодится
                          App.$refs.userContent.eq_layers_list.push(mylayer);  // Набор векторных слоев
                        }
                      }

                      if(mydata.eqTotalCount == 0)
                      {
                        console.log("No EQs for specified data. Server return: ", mydata );
                        App.$refs.userContent.eq_nodata_flag = true;
                      }


 

                    });



                //  RequestEQ();

                },

          },

          watch:
          {
            

          }


        });

var adminContent = Vue.extend({
      template: `
        <p>ADMIN CONTENT TEST</p>

          `
        });
