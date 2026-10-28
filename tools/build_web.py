import re,sys
root='/home/claude/voxel-arena/public/'
S='/tmp/claude-0/-home-claude/e552933f-bab8-59c7-9235-1d6c720e9b4c/scratchpad/'
html=open(root+'index.html',encoding='utf-8').read()
head,body=html.split('<body>',1)
body=body.split('</body>')[0]
style=re.search(r'<style>.*?</style>',head,re.S).group(0)
fonts=re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">.*?rel="stylesheet">',head,re.S).group(0)
markup=re.sub(r'<script src="[^"]+"></script>\s*','',body)
js=lambda f: open(root+f,encoding='utf-8').read()
parts=['window.LOCAL_BUILD=true;',js('map.js'),js('colls.js'),js('game.js'),js('localserver.js'),js('profile.js'),js('net.js'),js('weapons.js'),js('client.js'),js('lobby.js')]
three='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
out='<title>Voxel Arena</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'+fonts+'\n'+style+'\n'+markup+'\n'+three+'\n'+''.join('<script>'+p.replace('</script>','<\\/script>')+'</script>\n' for p in parts)
open(S+'web.html','w',encoding='utf-8').write(out)
print('web.html',len(out))
