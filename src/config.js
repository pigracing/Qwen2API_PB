const dotenv = require('dotenv')
dotenv.config()

const config = {
  dataSaveMode: process.env.DATA_SAVE_MODE || "none",
  apiKey: process.env.API_KEY || null,
  listenAddress: process.env.LISTEN_ADDRESS || null,
  listenPort: process.env.SERVICE_PORT || 3000,
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
    "bx-umidtoken": "T2gAH4jC27wJ1eiyaccyvfCzL3GnQNYDgc6MwON4mc0YhFaeKdEJDX9Fa69NKeUPjHQ=",
    "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Microsoft Edge\";v=\"133\", \"Chromium\";v=\"133\"",
    "bx-ua": "231!ZL03WAmUjnR+jo2E2k30mhBjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEkVa1wFtLD+zmK07PqZMNlYoIyE0c6UduD1WR503nDUm/6UL+MqOiohKNld82KS/5F7kt7tODImm+LNI8woUCIK83yOayfro9EOA00H81TcAjsGuSpLMxmAbEiRAwyVcD9BXclS0i3+b/YVlBji0tp6SlGgQ2Er+hmep4Dqk+I9xGdFZPnJAFlCok+++4mWYi++6RgxjORR9xBDjDj5v8uhhQ9Vstr6KJVROO+MEaZ5263y6cZ2HITUDYlQbDlg4zggsEpDVjE8llPbM6qniULLBSox6XNQ2+SItPFHPtzCPeShD3xnQU0TL40b777QhKLl9OdUNMJ/UN8OZjfozrorgSghRVhTFCWxP7W052CBlevSeqzDCO7WTXyxYN9KSDHK9nUaFFK4ss5NCZsVhBG/cEf90+iCGj1jAUHYdvMyStktnOEAagBsBjVcpk3c66BpRGZjGFLeTo3Mrf01peDbJbLvmKtl338YPw+tNKseOAZFYxni7gEUypxCAvFnTO50otwmp3cnWXuIJl3QSA9k8p9d3IlDwIEGqLodFH8mjBAVcjatG+KeHCsANSEKYaQGusDiFS2HLR1rt8uPfi5zK9asIIL2UjkTvoi/PlR0HiO2DjtQKUvr3+bDeSO1+NMyhw6KVKd3FuVOA5Rz21Nzvu30M2UuA0qb4jWOVdkQQthsSDPPI6X2wXREte4290PU8D5SEU64sWGpHlIZ2rKLFO+ED/ip02iasu45y2Kt5cx8tEcPtO/5yOtim1e8fe7kIcI+7arGaOkZOz24PBw8GYphPk5AB7/zv8oDyDQvwctcAGEzRvFogdqZxllpz3/27wss44NBJM8gv50zkFXsFIl8neIK6b/XI3vTUg/937D80H2bOYWYzEx4XCwZjRf4ut1qYsuRYCRMSQCKKdoKqL2oQ6o7CzFH42HQDjUBy0f7PbxqRfO9I0AlAnnhlklIvTqa3usG7p46yrQXQq8qRZc8ABMB/YDUJtmy5Zm//2u/PrBv4i4Mtj+i6orh5WKJVGH1elYzcIuh9WaKWj6MgZT7Wsy45eldVXPXNiyXE3yYep/xU+UNl4ZTrlnxaqexsCnh7ciFvPmuqUpQTeLYaBAcX+/1GdTqxx88Pz57j33s4JZc57E1TSsWJmCAD87Sl1Il/YXlgcrAb0hmrOs/PiJ81MaaoOxR5Tv6Xs7PyGV8QXJPK1OU6Ktaz838wHILZNMw/h6Wm1HU568FR4NaNl2StqlznZ3E12zBRIsRTMztxW6da2mCfivkBI2Cq2fdrZJ2j5cEse8zMIm5HBCNh5TPkhgDnEW1sfofYCJTFm+L0aZPP4xFWj8QWfDbI2kpEklWt62nXG04HQB0KwHWgP3O5Njfekh1I0WxoOt/kp9vZxKKkDD3caLIW2r/CRWq7wGwt5mNKdlAWDG+vecCjdTl09gls5r6prS2pU8Vk8d5Y4Dk/X/9h1H3J7z606FL59XmYXEB+2SIkyqAyewbmuMqIh3M+56dMmjuQXLNrQhd+0f9ImZCR+JXzu7cI/Sufm6dRyxG3aWABQA=",
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
  defaultCookie: "cna=qS5EIEcjlH0BASQOBGAZfs5p; _bl_uid=kOmRv8RR5mhvUg19zssbrybb6hbL; cnaui=3c1ea2c7-1757-4f25-8ed1-a2f626e29b24; aui=3c1ea2c7-1757-4f25-8ed1-a2f626e29b24; _gcl_au=1.1.828597960.1740456102.299114040.1745917063.1745917108; x-ap=ap-southeast-1; xlly_s=1; sca=56bf6645; acw_tc=0a03e55a17461873279576186e56b14bdf17e749c1b23cc157cdae240cf36c;  atpsida=8169f9b8e478b89d0b4f0855_1746187339_2; SERVERID=2a5b95a95df0bef46eabc51a17fbc623|1746187341|1746187327; ssxmod_itna=mqUxRDBDnD00I4eKYIxAK0QD2W3nDAQDRDl4Bti=GgexFqAPqDHI63vYWDjO4hDqqwx3Yi8+xqKx0yedmDA5Dnzx7YDtrSp5KKcrGhpoa78G0GomQ7r5qI18NoAxpY/ACGtpjrAW=ky=mKoDCPDExGk7mm+mDiiFx0rD0eDPxDYDG4Do1YDnx4DjxDdFRgvG+oDbxi3F4iaDGeDeOomDYHeDDHWP407fmoqDGvqtnYxccfjP8dYZ9oKR3IpD7v3DlpPHuGpg+69Qifjrd9f3xoDXhtDvx3Ypz7XRmEEhU883nv4m0a4m7xT0iNK4q0Gt9yen28D4tSr80i1WTKi+rBvPg4DGRYQD=TGd=he3YhmY1ju10TzmDxKhD3E=XnpmDq5G=L25qY=tx5MA5gYqe0hF7DBhYfooQiDD; ssxmod_itna2=mqUxRDBDnD00I4eKYIxAK0QD2W3nDAQDRDl4Bti=GgexFqAPqDHI63vYWDjO4hDqqwx3Yi8+xqmDDpr5P2i74GaQAwhnoQttDDsXY3ZcWQTlfubBjbqSpGU0qFu0LPqhrutI+0MONx67WO2CKe5KLODHKiGWHhr+mockjPOsoR7GOrGH9gBIXC7G77rkhO5K30EEbPPHYGcaKQhtC=2Wu3v+Z=KhXEDze+9GgtghFi3AL6LH5+e+CPdFZASdTI8QLIyW+I7Gx92c9h=fc9An1ZIwucGg/gi8g9TCouIj+s8O5=P/Cr0LKFKP7vo=vwGpCcoEpfoj5zEAH1fgGDMWhCxKCmdQpDj7DQAqQBpoeeEl36hGy7AgYKNbpWKb4GKqGvRewYOLCoKyY6ciuwCYKrKue5O2TXYijBRNefx6XqAGz8tq0GNZA1I540Y0mvw4PC8hjzA5gpxevhxmi/5oEU2+ItGT=oPdQo8/wBbiSl3PBRHWvBFRz/fwanHWR0fRIxWaK5Q3F2W9xNR2a0P66PYE52GLhhPs3iRyyCyHBX9EbeGIcbBZBY8Ixb+uwUyr/HIOv7XvZFAcDO3tBfC0lnrb5bq=BBn5Ndjvpj/GGi8t1nPX=Px4=Bxh=1pDpq8P3cDPP6f4PWr9URnFbtDblW1WecQdF4PMj/=1uyNEqiRIM/fCd91mKWdy4VhPkKjidU5qeTwerBKxYjAGH2DDbfr5cQ1aKjiMqiiP1cPWdHhtDxj+Pj7OrIr3ymtADVn5rGP2WEqsWDfHiw6Wxb7DIxiT1D=eiH7wdnHawse9hwQe6APTa6DxxYKnCOFQ8eFDo0DWooYTK29cqgiKePYGaFpTEtip4D; tfstk=g79IWVq4Oy4Q3J68V6mNct6ICK65Rck4JusJm3eU29BdPuTyD_IULDAW1U8CJpWKrTw9yiAP20xdVasXk6eRwMFWCUsYyzKdeAQOcEn3e_hhFNL5p_AFzw75F3Yjbqkq3HxhEa3quxufd6hcn7IRyzzTBMW5vaHzUQKhET3Z-Qn2IHYhM-h9vTn1Bgs0yTCL9Nn14i2RewC8W5IAWTBRJgCTWgSby8eRJctOSiXRyUCKf1QG2bN_5glC2HiHw0Lvjvh9jNw8edstrNKQT7QMpMi55H_skqp6n6_vvNw-ouKI4a_MHVl6jUdp8GYShV6viF95MTMQoMO9cOQFHjN1dh8Hh9pjRJSNNwO9p1Z8eOBNP1dWR2NhJB81iGCTVxjwuNKHpCiuWHLVR9IO_xnXX_dwKsvEWJ6viHWewE3aTwdf2gyz3Z_rP7Z1i8s1uci_Z7c2u5x9BcvxL6IGvxosfPNl9Gj63ci_G0fdjGPrfcaKW; isg=BG9vPVA2W_L5JVBnMYcLTA3c_oN5FMM20zElcIH0fF7k0IrSgeYjhJpGUsBuqJuu"
}

module.exports = config
