var App = null; // it's global because function behind will overwrite it's with Vue App instance
window.onload = function() {

Vue.use(VueResource); // ?
//Vue.use(VueTables.client, {} ); // ?

var GuestMenu = Vue.extend({
     props : ['login','password'],
      template: `
        <div id="auth">
            <form class="form-inline pull-right">
                <div class="form-group">
                    <label class="sr-only" for="login">User name</label>
                  <input type="login" v-model="login" class="form-control" id="login" placeholder="login">
                </div>
                <div class="form-group">
                  <label class="sr-only" for="Password">Password</label>
                  <input type="password" v-model="password" class="form-control" id="Password" placeholder="Password">
                </div>
              <button type="submit" class="btn btn-default" v-on:click.prevent="sendLoginInfo()">Login</button>
            </form>
        </div>`,

        methods: { //hash key-value
          sendLoginInfo : sendLoginInfo, // key (anyname) | value -> calling function name (from separate file) 
          //calling without brackets because we do need return from function, we need just function

          checkAuth: checkAuth // restore authorization after refresh page if user already have session!
        },
        ready()
        {
           this.checkAuth()
        }

          });

 var UserMenu = Vue.extend({
  props : ['login'],
      template: `
              <ul class="nav nav-tabs">
                <li role="user" class="active"><a href="#">USER</a></li>
                <li role="user"><a href="#">USER</a></li>
                <li role="user"><a href="#">USER</a></li>
                <li class="form-inline pull-right"><button type="submit" class="btn btn-default" v-on:click="logout()">Exit</button> </li>
                <li style="line-height: 35px; margin-right: 10px;" class="pull-right">Hello, <strong>{{login}}</strong></li> 
              </ul> 
          `,

        methods: { //hash key-value
          logout : logout // key (anyname) | value -> calling function name (from separate file) 
          //calling without brackets because we do need return from function, we need just function
        }

        });     

 var AdminMenu = Vue.extend({
  props : ['login'],
      template: `
              <ul class="nav nav-tabs">
                <li role="admin" class="active"><a href="#">Admin</a></li>
                <li role="admin"><a href="#">Admin</a></li>
                <li role="admin"><a href="#">Messages</a></li>
                <li class="form-inline pull-right"><button type="submit" class="btn btn-default" v-on:click="logout()">Exit</button> </li>
                <li style="line-height: 35px; margin-right: 10px;" class="pull-right">Hello, <strong>admin!</strong></li> 
              </ul>`,

        methods: { //hash key-value
          logout : logout // key (anyname) | value -> calling function name (from separate file) 
          //calling without brackets because we do need return from function, we need just function
        }
               
          });

////////////////////////////////
/*
var UserContent = Vue.extend({
      template: `
             <div>
            <p>USER CONTENT</p>
             </div>
          `});
*/          
/////////////
            
Vue.component('guestmenu', GuestMenu);
Vue.component('usermenu', UserMenu);
Vue.component('adminmenu', AdminMenu);

Vue.component('guestcontent', guestContent);
Vue.component('usercontent', userContent);
Vue.component('admincontent', adminContent);



App = new Vue ({ // App -- is need for overwrite global var. Global var need declarated abobe all function, because some it's function is calling from outside
   el: '#app',
  // template: '<usermenu></usermenu>',
  data: 
    {
      topMenuView: "guestmenu",
      contentView: "guestcontent",
      login: "",
      password: "",
      // rasters_previews_list : []
     // table_of_content_rasters_previews_items_list: []

    },

  methods: {
 
  },

    ready: function()
    {
      checkAuth.call(this) //binding with stand-alone function placed in authorization.js. Without binding _checkAuth_ will not see _data_

    }

  }


  )



}

