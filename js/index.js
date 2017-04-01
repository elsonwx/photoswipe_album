var initPhotoSwipeFromDOM = function(gallerySelector) {

    // parse slide data (url, title, size ...) from DOM elements 
    // (children of gallerySelector)
    var parseThumbnailElements = function(el) {
        var thumbElements = el.childNodes,
            numNodes = thumbElements.length,
            items = [],
            figureEl,
            linkEl,
            size,
            item;

        for(var i = 0; i < numNodes; i++) {

            figureEl = thumbElements[i]; // <figure> element

            // include only element nodes 
            if(figureEl.nodeType !== 1) {
                continue;
            }

            linkEl = figureEl.children[0]; // <a> element

            size = linkEl.getAttribute('data-size').split('x');
            data_type = linkEl.getAttribute('data-type');

            // create slide object
            item = {
                src: linkEl.getAttribute('href'),
                w: parseInt(size[0], 10),
                h: parseInt(size[1], 10)
            };

            if(data_type == "video") {
                    item = {
                        html: '<div class="wrapper"><div class="video-wrapper"><video class="pswp__video" src="' + linkEl.getAttribute('href') + '" controls></video></div></div>'
                    };
            }



            if(figureEl.children.length > 1) {
                // <figcaption> content
                item.title = figureEl.children[1].innerHTML; 
            }

            if(linkEl.children.length > 0) {
                // <img> thumbnail element, retrieving thumbnail url
                item.msrc = linkEl.children[0].getAttribute('src');
            } 

            item.el = figureEl; // save link to element for getThumbBoundsFn
            items.push(item);
        }

        return items;
    };

    // find nearest parent element
    var closest = function closest(el, fn) {
        return el && ( fn(el) ? el : closest(el.parentNode, fn) );
    };

    // triggers when user clicks on thumbnail
    var onThumbnailsClick = function(e) {
        e = e || window.event;
        e.preventDefault ? e.preventDefault() : e.returnValue = false;

        var eTarget = e.target || e.srcElement;

        // find root element of slide
        var clickedListItem = closest(eTarget, function(el) {
            return (el.tagName && el.tagName.toUpperCase() === 'FIGURE');
        });

        if(!clickedListItem) {
            return;
        }

        // find index of clicked item by looping through all child nodes
        // alternatively, you may define index via data- attribute
        var clickedGallery = clickedListItem.parentNode,
            childNodes = clickedListItem.parentNode.childNodes,
            numChildNodes = childNodes.length,
            nodeIndex = 0,
            index;

        for (var i = 0; i < numChildNodes; i++) {
            if(childNodes[i].nodeType !== 1) { 
                continue; 
            }

            if(childNodes[i] === clickedListItem) {
                index = nodeIndex;
                break;
            }
            nodeIndex++;
        }



        if(index >= 0) {
            // open PhotoSwipe if valid index found
            openPhotoSwipe( index, clickedGallery );
        }
        return false;
    };

    // parse picture index and gallery index from URL (#&pid=1&gid=2)
    var photoswipeParseHash = function() {
        var hash = window.location.hash.substring(1),
        params = {};

        if(hash.length < 5) {
            return params;
        }

        var vars = hash.split('&');
        for (var i = 0; i < vars.length; i++) {
            if(!vars[i]) {
                continue;
            }
            var pair = vars[i].split('=');  
            if(pair.length < 2) {
                continue;
            }           
            params[pair[0]] = pair[1];
        }

        if(params.gid) {
            params.gid = parseInt(params.gid, 10);
        }

        return params;
    };

    var openPhotoSwipe = function(index, galleryElement, disableAnimation, fromURL) {
        var pswpElement = document.querySelectorAll('.pswp')[0],
            gallery,
            options,
            items;

        items = parseThumbnailElements(galleryElement);

        // define options (if needed)
        options = {

            // define gallery index (for URL)
            galleryUID: galleryElement.getAttribute('data-pswp-uid'),

            getThumbBoundsFn: function(index) {
                // See Options -> getThumbBoundsFn section of documentation for more info
                var thumbnail = items[index].el.getElementsByTagName('img')[0], // find thumbnail
                    pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
                    rect = thumbnail.getBoundingClientRect(); 

                return {x:rect.left, y:rect.top + pageYScroll, w:rect.width};
            }

        };

        // PhotoSwipe opened from URL
        if(fromURL) {
            if(options.galleryPIDs) {
                // parse real index when custom PIDs are used 
                // http://photoswipe.com/documentation/faq.html#custom-pid-in-url
                for(var j = 0; j < items.length; j++) {
                    if(items[j].pid == index) {
                        options.index = j;
                        break;
                    }
                }
            } else {
                // in URL indexes start from 1
                options.index = parseInt(index, 10) - 1;
            }
        } else {
            options.index = parseInt(index, 10);
        }

        // exit if index not found
        if( isNaN(options.index) ) {
            return;
        }

        if(disableAnimation) {
            options.showAnimationDuration = 0;
        }

        // Pass data to PhotoSwipe and initialize it
        gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
        gallery.init();
        var $target_video;
        var startVideo = function startVideo() {
            if($target_video) {
                $target_video.remove();
            }
            var item = gallery.currItem;
            if(item.hasOwnProperty('html')) {
                item.html = item.html.replace('controls', 'controls autoplay');
                gallery.currItem.container.innerHTML = item.html;
                $target_video = document.querySelector('video');
            }
        };
        var stopVideo = function stopVideo() {
            var item = gallery.currItem;
            if(item.hasOwnProperty('html')) {
                item.html = item.html.replace('controls autoplay', 'controls');
                gallery.currItem.container.innerHTML = item.html;
            }
        };
        gallery.listen('initialZoomIn',startVideo);
        gallery.listen('initialZoomOut',stopVideo);
        gallery.listen('afterChange',startVideo);
    };

    // loop through all gallery elements and bind events
    var galleryElements = document.querySelectorAll( gallerySelector );

    for(var i = 0, l = galleryElements.length; i < l; i++) {
        galleryElements[i].setAttribute('data-pswp-uid', i+1);
        galleryElements[i].onclick = onThumbnailsClick;
    }

    // Parse URL and open gallery if it contains #&pid=3&gid=1
    var hashData = photoswipeParseHash();
    if(hashData.pid && hashData.gid) {
        openPhotoSwipe( hashData.pid ,  galleryElements[ hashData.gid - 1 ], true, true );
    }
};


function addMask(elem) {
          var rect = elem.getBoundingClientRect();
          var style = getComputedStyle(elem, null);

          var mask = document.createElement('i');
          mask.className = 'icon-film';
          mask.style.color = '#fff';
          mask.style.fontSize = '26px';
          mask.style.position = 'absolute';
          mask.style.right = '16px';
          mask.style.bottom = '17px';
          mask.style.zIndex = 1;
          elem.parentNode.appendChild(mask);
}

var createVideoIncon = function createVideoIncon() {
  var $videoImg = document.querySelectorAll('.thumb a[data-type="video"]');
  for (var i = 0, len = $videoImg.length; i < len; i++) {
    addMask($videoImg[i]);
  }
};

var render = function render(res) {
      var ulTmpl = "";
      for (var j = 0, len2 = res.list.length; j < len2; j++) {
        var data = res.list[j].arr;
        var liTmpl = "";
        for (var i = 0, len = data.link.length; i < len; i++) {
          var src = './photos/' + data.link[i];
          var data_type = "image";
          min_src = data.link[i];
          if(data.link[i].substring(data.link[i].lastIndexOf('.')) == '.mp4') {
              min_src = data.link[i].replace('.mp4','.jpg');
              data_type = "video";
          }
          var minSrc = './min_photos/' + min_src;
          var size = data.size[i];

          liTmpl += '<figure class="thumb" itemprop="associatedMedia" itemscope="" itemtype="http://schema.org/ImageObject">\
                        <a href="' + src + '" itemprop="contentUrl" data-type="'+ data_type +'" data-size="' + size + '">\
                          <img class="lazy" data-original="' + minSrc + '" width="320px" height="320px" itemprop="thumbnail" >\
                        </a>\
                        <figcaption style="display:none" itemprop="caption description">' + data.text[i] + '</figcaption>\
                    </figure>';
        }
        ulTmpl = ulTmpl + '<section class="album"><h1 class="year">' + res.list[j].year + '年<em>' + res.list[j].month + '月</em></h1>\
        <ul class="img-box-ul">' + liTmpl + '</ul>\
        </section>';
      }
      document.querySelector('.my-photo').innerHTML = '<div class="photos" itemscope="" itemtype="http://schema.org/ImageGallery">' + ulTmpl + '</div>';
      createVideoIncon();
      initPhotoSwipeFromDOM('.photos');
      $(".lazy").lazyload({
          effect : "fadeIn"
      });
};

function loadData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', './photos_data.json?t=' + +new Date(), true);

    xhr.onload = function() {
      if (this.status >= 200 && this.status < 300) {
        var res = JSON.parse(this.response);
        render(res);
        
      } else {
        console.error(this.statusText);
      }
    };

    xhr.onerror = function() {
      console.error(this.statusText);
    };

    xhr.send();
}

loadData();
// execute above function
//initPhotoSwipeFromDOM('.my-gallery');
