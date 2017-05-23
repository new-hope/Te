var app = angular.module("vkApp", [])
    .directive('clear', [ function () {
      return {
        link: function (scope, elem, attr) {
          var i = scope.$index + 1;
          if(!(i % 2)) {
            angular.element(elem).after('<div class="clearfix visible-sm"></div>');
          }
          if(!(i % 3)) {
            angular.element(elem).after('<div class="clearfix visible-md"></div>');
          }
          if(!(i % 4)) {
            angular.element(elem).after('<div class="clearfix visible-lg"></div>');
          }
        }
      };
    }])
    .factory("vkApiService", function ($http, $q) {

      return {
        getPromise: function(domain, count, offset) {
          var url = "https://api.vk.com/method/wall.get?domain=" + domain + "&count=" + count + "&offset=" + offset + "&callback=JSON_CALLBACK";
          var promise = $http.jsonp(url).success(function (res) {
            console.log(res);
          });
          return promise;
        },

        getWall: function(domain, count, offset) {
          var promises = [];
          var off = offset;

            while (count > 0) {
              promises.push(this.getPromise(domain, count, off));
              count -= 100;
              off += 100;
            }

          return $q.all(promises);
        }
      };
    })
    .factory("pagination", function($sce) {
      var currPage = 0;
      var itemsPerPage = 12;
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
        $scope.newitems = [];
        $scope.new = {domain: "extrawebdev",
                      count: 20,
                      offset: 0};


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

        $scope.get = function (domain, count, offset) {
          $scope.changePromisesArray(domain, count, offset);
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

        $scope.changePromisesArray = function(d, c, o) {
          vkApiService.getWall(d, c, o).
            then(function(response) {
              $scope.items = response.reduce(function(result, current) {
                return result.concat(current.data.response.slice(1));
              }, []);
            $scope.items = changeArray($scope.items);
            console.log($scope.items);
            pagination.setItems($scope.items);
            $scope.newitems = pagination.getPageItems();
            $scope.pagArray = pagination.getPagArray();
          });
        }

        function changeArray(array) {
          var items = [];
          array.forEach(function(item){
            var obj = {};
            if (angular.isDefined(item.attachment)){
              switch (item.attachment.type) {
                case "photo":
                  obj = {
                          header: serchHeader(item.text),
                          url: searchUrl(item.text),
                          image: item.attachment.photo.src,
                          date: item.date * 1000
                        };
                  if (angular.isDefined(item.attachments) && item.attachments[item.attachments.length - 1].type === "link") {
                    obj.header = item.attachments[item.attachments.length - 1].link.title;
                    obj.url = item.attachments[item.attachments.length - 1].link.url;
                  }
                  break;
                case "link":
                  obj = {
                          header: item.attachment.link.title,
                          url: item.attachment.link.url,
                          image: item.attachment.link.image_src,
                          date: item.date * 1000
                        };
                  if (angular.isDefined(item.attachments) && item.attachments[item.attachments.length - 1].type === "link") {
                    obj.header = item.attachments[item.attachments.length - 1].link.title;
                    obj.url = item.attachments[item.attachments.length - 1].link.url;
                  }
                  break;
                case "video":
                  obj = {
                          header: serchHeader(item.text),
                          url: null,
                          image: item.attachment.video.image,
                          date: item.date * 1000
                        };
                  break;
                case "doc":
                  obj = {
                          header: serchHeader(item.text),
                          url: searchUrl(item.text),
                          image: item.attachment.doc.thumb,
                          date: item.date * 1000
                        };
                  break;
              }
            }
            items.push(obj);
          });
          return items;

        }

        function serchHeader(str) {
          var reg = /http/;
          var pos = str.search(reg) > 0? str.search(reg):str.length;
          var string = str.slice(0, pos).replace(/<br>/g, "");
          if (string.length > 100) {
            return string.slice(0, 100).replace(/<br>/g, "") + "...";
          }
          return string;
        }

        function searchUrl(str) {
          var reg = /http/;
          var startPos = str.search(reg);
          var endPos = str.indexOf("<br>", startPos);
          var string = str.slice(startPos, endPos);
          return string;
        }

    }])
