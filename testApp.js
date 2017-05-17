var app = angular.module("vkApp", [])
    .directive('clear', [ function () {
      return {
        link: function (scope, elem, attr) {
          var i = scope.$index + 1;
          if(!(i % 2)) {
            angular.element(elem).after('<div class="clearfix visible-sm"></div>');
          }
          if( !(i % 3) ) {
            angular.element(elem).after('<div class="clearfix visible-lg"></div>');
            angular.element(elem).after('<div class="clearfix visible-md"></div>');
          }
        }
      };
    }])
    .factory("vkApiService", function ($http) {
      var items = [];
      return {
        getPromise: function(domain, count, offset) {
          var url = "https://api.vk.com/method/wall.get?domain=" + domain + "&count=" + count + "&offset=" + offset + "&callback=JSON_CALLBACK";
          var promise = $http.jsonp(url);
          return promise;
        },

        getWall: function(domain, count, offset) {
          this.getPromise(domain, count, offset).then(function (response) {
            items = items.concat(response.data.response.slice(1));
          }, function (error) {
            console.log("Error");
          });
          return items;
        },

        getWallAll: function(domain, count, offset) {
          if (count > 100){
            var off = offset;
            while (count > 0) {
              this.getWall(domain, count, off);
              count -= 100;
              off += 100;
            }
          return items;
          }else {
              return this.getWall(domain, count, offset);
            }
        }
      };
    })
    .factory("pagination", function($sce) {
      var currPage = 0;
      var itemsPerPage = 9;
      var items = [];

      return {
        setItems: function (newItems) {
          items = newItems;
        },

        getPageItems: function (numPage) {
          var numPage = angular.isDefined(numPage)? numPage:0;
          var start = itemsPerPage * numPage;
          var end = start + itemsPerPage;

          currPage = numPage;
          end = end > items.length?items.length:end;
          return items.slice(start, end);
        },

        getNumPages: function(){
          return Math.ceil(items.length / itemsPerPage);
        },

        getPagArray: function() {
          var numPage = this.getNumPages();
          var pagArray = [];
          pagArray.push({
            name: $sce.trustAsHtml("&laquo"),
            link: "prev"
          });
          for (var i = 0; i < numPage; i++){
            var index = i + 1;
            pagArray.push({
              name: $sce.trustAsHtml(String(index)),
              link: i
            });
          }
          pagArray.push({
            name: $sce.trustAsHtml("&raquo"),
            link: "next"
          });

          if (numPage > 1) {
            return pagArray;
          } else {
            return false;
          }
        },

        getCurrPageNum: function() {
          return currPage;
        },

        getPrevPage: function() {
          var prevPage = currPage - 1;
          if (prevPage < 0) {
            prevPage = 0;
          }
          return this.getPageItems(prevPage);
        },

        getNextPage: function() {
          var nextPage = currPage + 1;
          var pages = this.getNumPages();
          if (nextPage >= pages) {
            nextPage = pages - 1;
          }
          return this.getPageItems(nextPage);
        }
      }
    })
    .controller("vkCtrl", ["$scope", "vkApiService", "pagination", function($scope, vkApiService, pagination){
        $scope.getError = function (error) {
            if (angular.isDefined(error)) {
                if (error.required) {
                    return "Поле не должно быть пустым";
                }
            }
        };

        $scope.messageDomain = function() {
          return "Введите сокращенное имя пользователя или сообщества";
        };

        $scope.messageCount = function () {
          return "Введите количество записей для загрузки";
        };


        $scope.items = [];
        $scope.newitems;

        function isEmpty() {
          if ($scope.items.length === 0) {
              $scope.flagLoad = true;
          } else {
              $scope.flagLoad = false;
            }
        };

        $scope.get = function (domain, count, offset) {
          getWallApi(domain, count, offset);
        };

        $scope.getPage = function(numPage) {
          if (numPage == "prev") {
            $scope.newitems = pagination.getPrevPage();
          } else if (numPage == "next") {
            $scope.newitems = pagination.getNextPage();
          } else {
            $scope.newitems = pagination.getPageItems(numPage);
          }
        };

        $scope.getCurrPageNum = function() {
          return pagination.getCurrPageNum();
        };

        function getWallApi(d, c, o) {
          var newitems = vkApiService.getWallAll(d, c, o);
          console.log(newitems);
          newitems = changeArray(newitems);
          console.log(newitems);
          pagination.setItems(newitems);
          $scope.newitems = pagination.getPageItems();
          $scope.pagArray = pagination.getPagArray();
          console.log(newitems);
        }

        function changeArray(array) {
          var items = [];
          array.forEach(function(item){
            var obj = {};
            if (angular.isDefined(item.attachment)){
              switch (item.attachment.type) {
                case "photo":
                  obj.header = serchHeader(item.text);
                  obj.url = searchUrl(item.text);
                  obj.image = item.attachment.photo.src;

                  break;

              }
            }
            items.push(obj);
          });
          return items;

        }

        function serchHeader(str) {
          var reg = /https/;
          var pos = str.search(reg);
          var string = str.slice(0, pos).replace(/<br>/g, "");
          return string;
        }

        function searchUrl(str) {
          var reg = /https/;
          var startPos = str.search(reg);
          var endPos = str.indexOf("<br>", startPos);
          var string = str.slice(startPos, endPos);
          return string;
        }

    }])
