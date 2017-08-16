import React, { Component } from 'react';
import { $dontShowNaN, $cashRoi, $percentRoi, $currencySymbol, $numberWithCommas } from './Helpers';
import Coin from './Coin';
import './App.css';

class App extends Component {
  constructor () {
    super();

    this._toggleMenu = this._toggleMenu.bind(this);
    this._toggleCoinInfo = this._toggleCoinInfo.bind(this);
    this._closeCoinInfo = this._toggleCoinInfo.bind(this);
    this._onChange = this._onChange.bind(this);
    this._handleSubmit = this._handleSubmit.bind(this);
    this._handleSelectChange = this._handleSelectChange.bind(this);
    this._updateLocalWithSave = this._updateLocalWithSave.bind(this);
    this._hideAddApp = this._hideAddApp.bind(this);

    this.state = {
      menu_visibility: "hidden",
      coin_visibility: "hidden",
      coin_info: "", // defualt required for child <Coin/>
      add_ticker: "",
      add_cost_basis: "",
      add_hodl: "",
      coinz: {},
      portfolio_total: null,
      preferences: {
        currency: "USD"
      },
      coinfox_holdings: ""
    }
  }

  componentWillMount(){
    // if user doesnt have json
    if (!localStorage.hasOwnProperty('coinz')) {
      const localCoins = {};
      // object to array for map
      const lStore = Object.entries(localStorage);
      lStore.map((key) => {
        const ticker = key[0].replace(/_.*/i, '');
        const cost = ticker + "_cost_basis";
        const hodl = ticker + "_hodl";

        // if localCoins doesnt have the ticker yet, create it
        // add localStorage key to localCoins for state
        if (!localCoins.hasOwnProperty(ticker)) {
          localCoins[ticker] = {hodl: null, cost_basis: null};
          if (key[0] === cost) {
            // key[x] needs to be converted into number
            localCoins[ticker].cost_basis = Number(key[1]);
          } else if (key[0] === hodl) {
            localCoins[ticker].hodl = Number(key[1]);
          } else {
            console.log('invalid localStorage');
          }
        // localCoins has the ticker, so we add to it instead
        } else {
          if (key[0] === cost) {
            localCoins[ticker].cost_basis = Number(key[1]);
          } else if (key[0] === hodl) {
            localCoins[ticker].hodl = Number(key[1]);
          } else {
            console.log('invalid localStorage');
          }
        }
      })
      // convert to string for localStorage
      const stringCoins = JSON.stringify(localCoins);
      const jsonCoins = JSON.parse(stringCoins);
      // clear out old way of localStorage
      localStorage.clear();
      // add new json string to localStorage
      localStorage.setItem('coinz', stringCoins);

      const newCoinsState = {
        coinz: jsonCoins
      }
      this.setState(newCoinsState);
    } else if (localStorage.hasOwnProperty('coinz')) {
      const jsonCoins = JSON.parse(localStorage.coinz);
      const localPref = localStorage.pref
        ? JSON.parse(localStorage.pref)
        : this.state.preferences;
      const newCoinsState = {
        coinz: jsonCoins,
        preferences: {
          currency: localPref.currency
        }
      }

      this.setState(newCoinsState);
    }



  }

  componentDidMount(){
    this._marketPrice();
  }

  _costBasis(){
    var cost = 0;

    for (var coin in this.state.coinz) {
      const cost_basis = this.state.coinz[coin].cost_basis;
      const hodl = this.state.coinz[coin].hodl;
      if (hodl){
        cost = cost + (hodl * cost_basis);
      }
    }

    return cost //.toFixed(2);
  }

  _portfolioValue(){
    var value = 0;

    for (var coin in this.state.coinz) {
      const hodl = this.state.coinz[coin].hodl;
      const curr_price = this.state.coinz[coin].curr_price;
      if (hodl){
        value = value + (hodl * curr_price);
      }
    }
    return value;
  }

  _totalGainLoss(){
    return ( this._portfolioValue() - this._costBasis() ) //.toFixed(2);
  }

  _marketPrice(){
    const tempState = this.state.coinz;
    let currency = this.state.preferences.currency.toLowerCase();
    var userCurrency;

    // currencies to be converted
    // maybe make array indexOf [aud,xxx,etc]
    if (currency === 'aud' || currency === 'chf'){
      var userCurrency = currency.toUpperCase();
      currency = 'usd';
    }


    for (var coin in this.state.coinz) {
      var count = 1;
      const numCoins = Object.keys(this.state.coinz).length;
      const endpoint = 'https://api.cryptonator.com/api/ticker/'+ coin.toLowerCase() + '-' + currency;
      // if there is a valid coin, easy to add a "" coin, fix form to not submit w/o value
      if (coin){
        fetch(endpoint)
        .then(function(res) {
          if (!res.ok) {
              throw Error(res.statusText);
          }
          return res;
        })
        .then((res) => res.json())
        .then(function(res){

          let price = res.ticker.price;
          const volume24hr = res.ticker.volume;
          const change1hr = res.ticker.change;
          const tickerBase = res.ticker.base.toLowerCase()

          // CONVERTING CURRENCY
          if (userCurrency){
            const endpoint = 'https://api.fixer.io/latest?base=USD&symbols=' + userCurrency;

            return fetch(endpoint)
              .then(function(res) {
                if (!res.ok) {
                    throw Error(res.statusText);
                }
                return res;
              })
              .then((res) => res.json())
              .then((res)=> {
                  return ({
                    conversionRate: res.rates[userCurrency],
                    theCoin: tickerBase,
                    price: price
                  });
                }
              )
          } else {
            return {
              conversionRate: 1,
              theCoin: tickerBase,
              price: price,
              volume24hr: volume24hr,
              change1hr: change1hr
            }
          }
          // END CURRENCY CONVERSION
        })
        .then(function(newRes){

          let displayPrice =  Number(newRes.price);
          if (newRes.conversionRate !== 1) {
            displayPrice = newRes.conversionRate * displayPrice;
          }
          tempState[newRes.theCoin].curr_price = displayPrice;
        })
        .then(function(){
          count++;
          if (count >= numCoins) {
            this.setState({coinz: tempState});
          }
        }.bind(this))
      }


    }

  }

  _toggleMenu(){
    if (this.state.menu_visibility === "hidden") {
      this.setState({menu_visibility: ""})
    } else {
      this.setState({menu_visibility: "hidden"})
    }
  }

  _handleSubmit (e) {
    e.preventDefault();

    const currentCoins = JSON.parse(localStorage.coinz) || {};
    const ticker = this.state.add_ticker.toLowerCase();
    const costBasis = Number(this.state.add_cost_basis);
    const hodl = Number(this.state.add_hodl);

    currentCoins[ticker] = {
      cost_basis: costBasis,
      hodl: hodl
    }

    const stringCoins = JSON.stringify(currentCoins);
    if (ticker && costBasis >= 0 && hodl) {
      localStorage.setItem("coinz", stringCoins);
      window.location.href = window.location.href;
    } else {
      alert("Please fill in the ticker, cost basis & holding")
    }

  }


  _handleSelectChange(e){
    const domElement = e.target.id;
    const statePref = this.state.preferences;
    const localPref = localStorage.pref
      ? JSON.parse(localStorage.pref)
      : {};

    localPref[domElement] = e.target.value;
    statePref[domElement] = e.target.value;

    localStorage.setItem('pref', JSON.stringify(localPref));
    this.setState(statePref);
    this._marketPrice();
  }

  _onChange (e) {
    var text = e.target.value;
    var item = e.target.className;

    this.setState({[item]: text});
  }

  _closeCoinInfo () {
    this.setState({coin_visibility: ""});
  }

  _toggleCoinInfo (e) {
    const coin = e.target.id;
    console.log(coin);
    console.log(e.target);
    this.setState({coin_info: coin})
    if (this.state.coin_visibility === "hidden") {
      this.setState({coin_visibility: ""})
    } else {
      this.setState({coin_visibility: "hidden"})
    }
  }

  _downloadLocalStorage () {
    function download(filename, objectOfStrings) {
      const coinz = objectOfStrings.coinz;
      const pref = objectOfStrings.pref;
      const json = {};

      if (coinz) {
        json["coinz"] = JSON.parse(coinz);
      }
      if (pref) {
        json["pref"] = JSON.parse(pref);
      }

      var text = JSON.stringify(json);

      var element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + text);
      element.setAttribute('download', filename);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    }
    download('coinfox_holdings.json', localStorage );
  }

  _updateLocalWithSave(e){
    e.preventDefault();

    const saveToLocalStorage = JSON.parse(this.state.coinfox_holdings);
    const coinz = saveToLocalStorage.coinz;
    const pref = saveToLocalStorage.pref;

    if (coinz) {
      localStorage.setItem('coinz', JSON.stringify(coinz));
    } else {
      alert("Something is wrong with your Save File, please try downloading it again");
    }
    if (pref) {
      localStorage.setItem('pref', JSON.stringify(pref));
    }

    location.reload();

  }





  _updateLocalFromRemoteWithSave(e){
    // https://stackoverflow.com/a/43268098/485361 for CORS
    e.preventDefault();


    const endpoint_inf = 'http://inflexion.ch/19823812398123708917238012308912/coinfox_holdings.json';


    var proxyUrl = 'https://cors-anywhere.herokuapp.com/',
     targetUrl = endpoint_inf;
    fetch(proxyUrl + targetUrl)
    .then(blob => blob.json())
    .then(data => {



        //const saveToLocalStorage = data;

        const coinz = data.coinz;
        const pref = data.pref;

        if (coinz) {
          localStorage.setItem('coinz', JSON.stringify(coinz));
        } else {
          alert("Something is wrong ... try it again.");
        }
        if (pref) {
          localStorage.setItem('pref', JSON.stringify(pref));
        }
        location.reload();


    })
    .catch(e => {
    console.log(e);
    return e;
    });




  }

  _hideAddApp () {
    localStorage.setItem('seenAddApp', "true");
    this.forceUpdate();
  }

  render() {


    const coinCloseClass = this.state.coin_visibility + " coin-close fa fa-lg fa-times";

    const coinStats = Object.entries(this.state.coinz);
    const totalGainLoss = this._totalGainLoss();
    const currencyPref = this.state.preferences.currency
    const avgCostBasis = "Average Cost Basis ("+ $currencySymbol(this.state.preferences.currency) +"/per coin)"
    const headerColor = totalGainLoss < 0
      ? "App-header red"
      : "App-header";
    const gainz = Object.keys(this.state.coinz).length
      ? $currencySymbol(this.state.preferences.currency) + $numberWithCommas($dontShowNaN(totalGainLoss).toFixed(2)) + " (" + $numberWithCommas($dontShowNaN($percentRoi(this._portfolioValue(), this._costBasis()).toFixed(2))) + "%)"
      : "Use the menu to add your coin holdings";

    const shouldShowBanner = window.location.hostname === "vinniejames.de" ? "banner" : "banner hidden";



    return (
      <div className="App">
        <div className={shouldShowBanner}>
          <p className="text-center">
            Moving to a new home: <a className="red" href="http://coinfox.co">Coinfox.co</a>! <br/>
            Please use the import/export feature to move your data.
          </p>
        </div>
        <i onClick={this._toggleMenu} className="btn-menu fa fa-lg fa-bars" aria-hidden="true"></i>
        <div id="menu-body" className={this.state.menu_visibility}>
          <i onClick={this._toggleMenu} className="btn-menu fa fa-lg fa-times" aria-hidden="true"></i>

          <label htmlFor="currency">{$currencySymbol(this.state.preferences.currency) || "USD"}</label>
          <select id="currency" onChange={this._handleSelectChange} value={currencyPref} name="select">
            <option value="AUD">{$currencySymbol('aud')} AUD</option>
            <option value="BTC">{$currencySymbol('btc')} BTC</option>
            <option value="CAD">{$currencySymbol('cad')} CAD</option>
            <option value="CHF">{$currencySymbol('chf')} CHF</option>
            <option value="CNY">{$currencySymbol('cny')} CNY</option>
            <option value="EUR">{$currencySymbol('eur')} EUR</option>
            <option value="GBP">{$currencySymbol('gbp')} GBP</option>
            <option value="JPY">{$currencySymbol('jpy')} JPY</option>
            <option value="RUR">{$currencySymbol('rur')} RUR</option>
            <option value="UAH">{$currencySymbol('uah')} UAH</option>
            <option value="USD">{$currencySymbol('usd')} USD</option>
          </select>

          <hr />
          <h3>Add a Coin</h3>
          <form className="" onSubmit={this._handleSubmit}>
                <input type="text"
                  className="add_ticker"
                  onChange={this._onChange}
                  value={this.state.ticker}
                  placeholder="Ticker: (BTC, LTC, etc)"/>
                  <br/>
                <input type="text"
                  className="add_cost_basis"
                  onChange={this._onChange}
                  value={this.state.cost_basis}
                  placeholder={avgCostBasis}/>
                  <br/>
                <input type="text"
                  className="add_hodl"
                  onChange={this._onChange}
                  value={this.state.hodl}
                  placeholder="Number of Coins Held"/>
                <br/>
                <input className="" type="submit" value="Go"/>
            </form>

            <hr/>
            <h3>Transfer your data to another device</h3>
            <br/>
            <a className="btn pointer" onClick={this._downloadLocalStorage}><i className="fa fa-lg fa-download" aria-hidden="true"></i> Download your Save File</a>
            <br/><br/><br/><br/>
            Then, on your new device
            <br/><br/>
            Copy/Paste the contents of your Save File below
            <br/>
            <form className="" onSubmit={this._updateLocalWithSave}>
              <input type="text"
                className="coinfox_holdings"
                onChange={this._onChange}
                value={this.state.coinfox_holdings}
                placeholder="Paste Save File contents here"/>
              <input className="" type="submit" value="Save"/>
            </form>


            <br/><br/>
            or load from remote.
            <br/>
            <form className="" onSubmit={this._updateLocalFromRemoteWithSave}>
              <input type="text"
                className="coinfox_holdings"
                onChange={this._onChange}
                value={this.state.coinfox_holdings}
                placeholder="Paste remote URL here"/>
              <input className="" type="submit" value="Save"/>
            </form>


        </div>

        <div className={headerColor}>
          <div className="Overview">
          <h1>
            {$currencySymbol(this.state.preferences.currency)}{$numberWithCommas($dontShowNaN(this._portfolioValue()).toFixed(2))}
          </h1>
          <h2>
            {gainz}
          </h2>
          </div>
        </div>
        <div className="Coins">
          {coinStats.map(function(coin, i){
            const ticker = coin[0].toUpperCase();
            const hodl = parseFloat(Number(coin[1].hodl).toFixed(2));
            const gain_loss = ((Number(coin[1].curr_price) - Number(coin[1].cost_basis) ) * Number(coin[1].hodl) ).toFixed(2);
            const curr_price = Number(coin[1].curr_price).toFixed(2);
            const color = gain_loss >= 0 ? "green" : "red";

            if (!Number(hodl)) {
              return null;
            } else {
              return (
                <div id={ticker} onClick={this._toggleCoinInfo} key={i} className="coin">
                  <p className="float-left">
                    {ticker}<br/>
                    <span>{$numberWithCommas(hodl)} Coins</span>
                  </p>
                  <i className="fa fa-lg fa-info-circle" aria-hidden="true"></i>
                  <p className="text-right float-right">
                    <span className={color}>{$currencySymbol(this.state.preferences.currency)}{$numberWithCommas($dontShowNaN(gain_loss))}</span><br/>
                    <span>{$currencySymbol(this.state.preferences.currency)}{$numberWithCommas($dontShowNaN(curr_price))}</span>
                  </p>
                </div>
              );
            }

          }.bind(this))}
        </div>
          <span>
            <i onClick={this._closeCoinInfo} className={coinCloseClass} aria-hidden="true"></i>
            <Coin visible={this.state.coin_visibility} parentState={this.state} coin={this.state.coin_info} />
          </span>
        {localStorage.seenAddApp !== "true" &&
          <div className="save-app">Add to Home Screen for app experience <i onClick={this._hideAddApp}
                                                                             className="fa fa-times text-right"
                                                                             aria-hidden="true"></i></div>
        }
      </div>
    );
  }
}

export default App;
