const dotenv = require('dotenv')
dotenv.config()

const config = {
  apiKey: process.env.API_KEY || null,
  listenAddress: process.env.LISTEN_ADDRESS || null,
  listenPort: process.env.LISTEN_PORT || 3000,
  apiPrefix: process.env.API_PREFIX || '',
  searchInfoMode: process.env.SEARCH_INFO_MODE === 'true' ? "table" : "text",
  outThink: process.env.OUTPUT_THINK === 'true' ? true : false,
  redisURL: process.env.REDIS_URL || null,
  autoRefresh: false,
  autoRefreshInterval: 6 * 60 * 60,
  defaultHeaders: {
    "Host": "chat.qwen.ai",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
    "Connection": "keep-alive",
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Content-Type": "application/json",
    "bx-umidtoken": "T2gAXHjo-gwZXMp1imYSacNSgg-s39D066VZk8P5QWsDfU4ZIXgyrsgJuXBruLtZd6U=",
    "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Microsoft Edge\";v=\"133\", \"Chromium\";v=\"133\"",
    "bx-ua": "231!h+E3A4mUEDD+j3W42k301dBjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEkVa1wFtLD+zjulzVfhndyTScQXMkGVcC9byQmtk201ePaqQWYrovREV0wqL2CUPUKzVOkGN8s47podMfj9LFgnfgRmaQC4v6FA24XxeEVbKOAY5YPubzsWeDqB05ZDyS+Lzcg1lF4gt+bJEsc9QoihanFaXtGr+hmep4Dqk+I9xGdFZPnJAFlCok+++4mWYi++6RXTo7bA9PBDjDj5v8uhhQ9Vstr6KJVROO+MEa5m/C+6DVWIUOPAdDF7fCD5iyX9A6PyJaMbcrrlWT9w2jzDDVJlRXNoYF2PE9IwmgkXZC96lFy5ilUdyOh8FcxIDrP8IQZVcfVsqwov+gu5mUZseHnZePUZfu6iYBQv/ZG1nUQZCt9pnbFxIcfghR0h2Yd2MzwASLwx5l0l+6VZ9werLV5MbFgua/QW/vcco6NDk3LUf6/K/ZO6Jru3gNbCP8PsU5cpRqFto7QQct1iV9bdynts4xcV62a0pTQn1FPmPSfr+X++1Iakro1EUGCAb0ow0K2/W0r07/0uzytd//ieMsV3pKwvkIL18vcr3eabA/rgQodUSZAcQk6KynHBluFRciPEB/HKr3/IxhgLzgXEOYZFGC7ITheGuH2zRLLo+iT70Fbf9EWHKSgkjV0BwyrcYNKpUHailiX1sp6Y+fohGcGEYkbYbOaOTvi9nkZAlxeVqdLBDSRGOQcuG5ASZ9hiFjLWDQ8J6gfiWlti/KFyDrStIs8fp7GbzN8rVVZS5LncwKP+lEbtRaKKvfpj+0AZH2iMepwhsIT/PARBPtv5iAyEto+riE35sEKzceLjZaKkaUBltderSMy/mHCdw2MlQmVwet3HzIh21KdPThucnO9AR/FsuP/wsqX35NuzzUWXVesKcusoCVIf6raou8a09W6ZnGqilKW3xzHqfsL2+mHUVojQO5pt/QhTWR+QVjhe7sraRSmqYVhTeAZdpVtr3kv4UweZkfTdOnoxczbJAdmrUOXMSlmlvKvtka/wdeW5wZ7SGyhLpiTj73bg3dQaBLmBS8PzApjXkqfP9d0UZE83yTxkCwrr8c01aAfFj2FvPKV98e/whvujHsv+hF91fpmeTluY+iCgmusfM6fIlr19nkKT6izq09Gxq71+31PVu1uqk7zGB2toEqlczQba7V7gyLhW82bXLYiYqOk2O+++vNWxbab+HccRimTS7mcRgEzXyomnnEkQuWUQiA7vxKZFPb6eWmWx1lGRQBQfOj8TbuwePXDaoTqrgtaUBSPSEpwMaFib3Rn6fCvVovIXuqczTMUiFb8GqifNbL+9Adh1JxlDh+fBBZmkFcpsqIeRxEyIDzLesmCKy4TXCXjvNXyu4AE/j5yV0dEykCCNqzWFGRswKuu82sS/ePB6GUa151SkkXf6nSqlT/rCR69QWAEs+fIh8+cZsOsiJRFINGVZXlE9KwQp3GfJxpdKG2bWUo2fOC00b+2vZ8QGgQTc+V1J4l55EcIlqzXv1bSwnTZhx4sNw+yy+2jvayfC942QBgNVYkvuLGemk1Mmalia7SrVNvjJVvg2kn2K1x/ppVxl0y8bGwHCNc0i9vG=",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "bx-v": "2.5.28",
    "origin": "https://chat.qwen.ai",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "referer": "https://chat.qwen.ai/",
    "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "priority": "u=1, i"
  },
  defaultCookie: "cna=qS5EIEcjlH0BASQOBGAZfs5p; _bl_uid=kOmRv8RR5mhvUg19zssbrybb6hbL; _gcl_au=1.1.828597960.1740456102.2077920929.1743157094.1743157245; acw_tc=0a03e53617439970410204419e5ae8476c313711757a6ffde5f510ddf8b989; x-ap=ap-southeast-1; sca=b18a215e; cnaui=3c1ea2c7-1757-4f25-8ed1-a2f626e29b24; aui=3c1ea2c7-1757-4f25-8ed1-a2f626e29b24; xlly_s=1; atpsida=c6a630bb7936baa90617b57c_1743997052_3; ssxmod_itna=mqUxRDBDnD00I4eKYIxAK0QD2W3nDAQDRDl4Bti=GgexFqAPqDHIa3vYW0K37WIi77DoqTQi84D/I7heDZDG9dDqx0obXl0DoDkY00Rm3d=i70e+FBR7O59+g+Yo4eCT+rhhMxT8iZkyY+eDU4GnD0=QtbrbDYAfDBYD74G+DDeDixGmteDSDxD9DGPdglTi2eDEDYPdxA3Di4D+jebDmd4DGqf4x7QaRmxD0ux58mDS8a946PmzMeqOPubDjTPD/R+LO0RC2FkKYa9APkcmGeGyi5GuDPmbNjHORnniHpYPSTxb93xbj7o7DYqAx7GdMk4Cr=7iGeDYexqn2NO0D5x=AOdkxDiheKCrnGDblqUi+n2tyxNgr+iI0m0IHSbbAAoerdWreGI3+mCjw4QxPe5K/NzC0q7T/oD; ssxmod_itna2=mqUxRDBDnD00I4eKYIxAK0QD2W3nDAQDRDl4Bti=GgexFqAPqDHIa3vYW0K37WIi77DoqTQi4DWmW7AooeFKD7p1Qm42brDlZfuadWO0cDBoG2Y/ceQbvQh3KUTri14Hybv+/t7D9e/UE/kNcAMQMWwDEj4qe=G6Htd=QQi3czLrU+RblYn4PM40Ujb=rkRbPfTtd5Q=lzrXogWfNc4QcfewBAMP1xmWuARDUb6yWulPiEMv28dHMtdyhu=NMY=c/jiLyjfoQSTLpX8DkalnZQ4TKPu6WvB7MFM=wWaxuxCvLW=xZc1MPp4x+uW7m134DuWs/TUeTsGm4RRaYGPzy9I+tWW5BrCWw4I+PtKgBFkSTlAqI+ulRp9zx1Kn0S+M+PHF7Do50mR5n4kj+OeokWvFQDAmmF3EpYwfeYL4SLIDqtwtaqqWnTwKHiDkRhA98szKFOwHaamnqqoFOIOQ7u2eTpSp+9uWGaLB4K3Ik3Y=gasI+inmkNYhtaElHNkq4DHEfnMDylRoxeSZ9qsqYGzHNVSeSqIxn5m41cCkApxug/e6P7vAchFWWzqIOs54hK4wus+xaW09fewn9Yw+F0oujbN=u1DBTrG2q8A0eQdTkFuVjRex/2hAnhTCC5aGl8Ap0eSs0w4SqoRh5Yxze7p7bOlMTkqqITfjDYy9lmstx3N9IanhzSwwoD5I2ds/Ky2D8QLYdtwDQGSqeDxSUyGxE45WvGXv8D7XGEmbtliqgieQpSoKDxzwsDU0GzqV44EYPwXRwxD4zBq1YGTG4idR8zvW44xtRG1SGvGe7G+mYt4CBV3DKdL0GwnYHwnu4Y4xD; SERVERID=e4ed9fad8a5a5834ea1011f9e693e4e5|1743997148|1743997041; tfstk=gvni4oONXVz1xTGR6Xr6rkI6pY8KWOZbCjIYMoF28WPIXjL_M2qqUb4YuFgttSVEwRoY0NzDY-VHhNR_uD2UFRJb7iJboJPKas747IaU8-wc_OyZm2smFxi9Cop_fAZb0QdJ2nDsCo_N1QWimkkUC-xA0PSafklI8zlv23HsQ2PtoPt-XRWCJ5F40PzVT9PQnNyqgryUYWwb31yVbpDUOWyV0SSaTkyTU1PqgoJnLWw40Rl4CNP-04oeOzMSInwJfcwgS7ka_AHKY6ZF5YVh0ion-PVzvWjV0D2ipF2w2gYYa4NTyScevGqmL-c3yVAljjDqFqznm1JtaXumgJgBiZVouA3SuyvwbvqgsbmQrO70jqlsmPgGhLMUbXg7NP8BOJmt2rV7-6RZpvVarqc9OiPtrvl3yDCd2uuStm4z4gu58a-WLiweHD7flPyQK7ej68vhsMoLApvhyxaad8NJKpbvIPyQLVJHKaSY7Jwtt; isg=BHV1ACwtfscri5o1J-FRXnOihPEv8ikEff_vAveQ5-w7zpjAu0YA1SKAGJJ4jkG8"
}

module.exports = config
