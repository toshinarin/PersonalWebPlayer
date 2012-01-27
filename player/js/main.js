function trimMetaDataText(str) {
    return decodeURIComponent(
            encodeURIComponent(str).
            replace("%00%00%00%01%00%00%00%00", "")
        );
}

function initPlayer(player) {
    var _duration = 0;
    var progressElem = $("#progress");
    var titleElem = $("#title");
    var artistElem = $("#artist");
    var durationElem = $("#duration");
    var playBtnElem = $("#play_button");
    
    player.on('progress', function(time) {
        console.log('time: ' + time);
        progressElem.css('width', Math.floor(time * 100 / _duration) + "%");
    });

    player.on('duration', function(duration) {
        var min = Math.floor(duration / 60000);
        var sec = ("00" + Math.floor((duration - (min * 60000)) / 1000)).slice(-2);
        durationElem.text(min + ":" + sec);
        _duration = duration;
    });
    
    player.on('metadata', function(meta) {
        console.dir(meta);
        titleElem.text(trimMetaDataText(meta.Title));
        artistElem.text(trimMetaDataText(meta['Album Artist']));
    });

    playBtnElem.click(function(e){
        if ($(this).hasClass('stop')) {
            $(this).removeClass('stop')
            player.play();
        } else {
            $(this).addClass('stop')
            player.pause();
        }
        return false;
    })
    
    player.preload();
}

function play(url) {
    var player = Player.fromURL(url);
    initPlayer(player);
    //player.play();
}

$(document).ready(function(){
    var musicUrl = '../music/Crosslight/05 COSMiCA.m4a';
    var url = $.url(location.href);
    urlAttr = url.param('url');
    if (urlAttr) {
        musicUrl = urlAttr;
    }

    play(musicUrl);
});
