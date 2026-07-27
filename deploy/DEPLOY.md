# Reactievergelijkingen deployen (Next + PM2)

Zelfde aanpak als Scheikunde Lab / Haemo.

## Architectuur

- **Next.js** op server **NEXT** (`192.168.1.32`) → `/var/www/reactievergelijking` → poort **3017**
- **PM2** procesnaam: `reactievergelijking`
- GitHub: `git@github.com:boerdb/reactievergelijking.git` (branch `main`)
- Geen database nodig

```
Telefoon/LAN → http://192.168.1.32:3017 → Next.js
```

## Eerste installatie

Vanaf je PC:

```bash
python scripts/deploy_git_init.py
```

Of handmatig op de server:

```bash
cd /var/www
git clone git@github.com:boerdb/reactievergelijking.git reactievergelijking
cd reactievergelijking
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

## Updates

```bash
python scripts/deploy_pull.py
```

Of op de server:

```bash
cd /var/www/reactievergelijking
git pull
npm ci
npm run build
pm2 restart reactievergelijking --update-env
```

## Controle

```bash
pm2 list | grep reactievergelijking
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3017/
```

App: http://192.168.1.32:3017
