# trex - cli recorder + html5 player

## install

```
curl http://gitlab.pag/j.kohlhof/trex/raw/master/bin/trex > trex
chmod u+x trex

./trex [record|replay] -h
```

## record

```
./trex record my_session.json

# ...
# record your session, when finished:
exit
```

## playback

In your terminal:

```
./trex replay my_session.json
```

Show the session on your webpage:

``` html
# ...
<body>
    <head>
        <style rel="stylesheet" href="css/jquery.trex.min.css">
    </head>
	<div class="trex" data-session="/my_session.json"></div>
	...
	<script src="http://code.jquery.com/jquery-2.0.2.min.js"></script>
	<script src="jquery.trex.min.js"></script>
    <script type="text/javascript">
        $(function() { 
            $(".trex").trex({
                speed: 1,
                auto_start: false
            }); 
        })
    </script>
```


## build 

```
npm install
bin/grunt 
```
