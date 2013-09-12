# trex - cli recorder + html5 player

## install

```
curl http://gitlab.pag/j.kohlhof/trex/raw/master/bin/trex > trex
chmod u+x trex

./trex -h
```

## record

```
./trex my_session.json

# ...
# record your session, when finished:
exit
ls -l my_session.json
```

## playback

``` html
# ...
<body>
    <head>
        <style rel="stylesheet" href="css/jquery.trex.min.css">
    </head>
	<div class="terminal" data-session="/trex-sessions/my_session.json"></div>
	...
	<script src="http://code.jquery.com/jquery-2.0.2.min.js"></script>
	<script src="jquery.trex.min.js"></script>
```


## build

```
npm install
grunt 
```

