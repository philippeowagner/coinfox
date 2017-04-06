import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor () {
    super();

    this._toggleMenu = this._toggleMenu.bind(this);
    this._onChange = this._onChange.bind(this);
    this._handleSubmit = this._handleSubmit.bind(this);

    this.state = {
      menu_visibility: "hidden",
      add_ticker: "",
      add_cost_basis: "",
      add_hodl: "",
      coinz: {
        btc: {
          cost_basis: Number(localStorage.btcCost),
          curr_price: 0,
          hodl: Number(localStorage.btcHodl),
        },
        eth: {
          cost_basis: Number(localStorage.ethCost),
          curr_price: 0,
          hodl: Number(localStorage.ethHodl),
        },
        ltc: {
          cost_basis: Number(localStorage.ltcCost),
          curr_price: 0,
          hodl: Number(localStorage.ltcHodl),
        },
        doge: {
          cost_basis: Number(localStorage.dodgeCost),
          curr_price: 0,
          hodl: Number(localStorage.dogeHodl),
        },
        xmr: {
          cost_basis: Number(localStorage.xmrCost),
          curr_price: 0,
          hodl: Number(localStorage.xmrHodl),
        },
        gnt: {
          cost_basis: Number(localStorage.gntCost),
          curr_price: 0,
          hodl: Number(localStorage.gntHodl),
        }
      }
    }

  }
  componentDidMount(){
    this._marketPrice();
  }
  _numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  _costBasis(){
    var cost = 0;

    for (var coin in this.state.coinz) {
      const cost_basis = this.state.coinz[coin].cost_basis;
      const hodl = this.state.coinz[coin].hodl;
      cost = cost + (hodl * cost_basis);
    }

    return cost.toFixed(2);
  }
  _portfolioValue(){
    var value = 0;

    for (var coin in this.state.coinz) {
      const hodl = this.state.coinz[coin].hodl;
      const curr_price = this.state.coinz[coin].curr_price;
      value = value + (hodl * curr_price);
    }

    return value.toFixed(2);
  }
  _totalGainLoss(){
    return ( this._portfolioValue() - this._costBasis() ).toFixed(2);
  }
  _percentReturn(){
    return ( 100 * ( ( this._portfolioValue() / this._costBasis() ) - 1 ) ).toFixed(2);
  }

  _marketPrice(){
    const tempState = this.state.coinz;

    for (var coin in this.state.coinz) {
      var count = 1;
      const numCoins = Object.keys(this.state.coinz).length;
      const endpoint = 'https://api.cryptonator.com/api/ticker/'+ coin +'-usd';

      fetch(endpoint)
      .then(function(res) {
        if (!res.ok) {
            throw Error(res.statusText);
        }
        return res;
      })
      .then((res) => res.json())
      .then(function(res){
        const price = res.ticker.price;
        // var coin was not keeping the correct value in here
        // using res.ticker.base instead
        const theCoin = res.ticker.base.toLowerCase();
        tempState[theCoin].curr_price = price;
      })
      .then(function(){
        count++;
        if (count >= numCoins) {
          this.setState({coinz: tempState});
        }
      }.bind(this))
    }

  }
  _toggleMenu(){
    console.log('menu');
    if (this.state.menu_visibility === "hidden") {
      this.setState({menu_visibility: ""})
    } else {
      this.setState({menu_visibility: "hidden"})
    }
  }

  _handleSubmit (e) {
    e.preventDefault();
    console.log(this.state.add_ticker, 'yes');
    const keyCost = this.state.add_ticker.toLowerCase() + "Cost";
    const keyHodl = this.state.add_ticker.toLowerCase() + "Hodl";
    const costBasis = this.state.add_cost_basis;
    const hodl = this.state.add_hodl;
    localStorage.setItem(keyCost, costBasis);
    localStorage.setItem(keyHodl, hodl);
    window.location.href = window.location.href;
  }
  _onChange (e) {
    var text = e.target.value;
    var item = e.target.className;
    //console.log(item);
    this.setState({[item]: text});
  }

  render() {
    const coinStats = Object.entries(this.state.coinz);

    return (
      <div className="App">
        <i onClick={this._toggleMenu} className="btn-menu fa fa-lg fa-bars" aria-hidden="true"></i>
        <div id="menu-body" className={this.state.menu_visibility}>
          <i onClick={this._toggleMenu} className="btn-menu fa fa-lg fa-times" aria-hidden="true"></i>

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
                  value={this.state.cost_basist}
                  placeholder="Average Cost Basis"/>
                  <br/>
                <input type="text"
                  className="add_hodl"
                  onChange={this._onChange}
                  value={this.state.hodl}
                  placeholder="Number of Coins Held"/>
                <br/>
                <input className="" type="submit" value="Go"/>
            </form>

        </div>


        <div className="App-header">
          <div className="Overview">
          <h1>
            ${this._numberWithCommas(this._portfolioValue())}
          </h1>
          <h2>
            ${this._numberWithCommas(this._totalGainLoss())} ({this._numberWithCommas(this._percentReturn())}%)
          </h2>
          </div>
        </div>
        <div className="Coins">
          {coinStats.map(function(c, i){
            const coin = c;
            const ticker = coin[0].toUpperCase();
            const hodl = this._numberWithCommas(coin[1].hodl.toFixed(0));
            const gain_loss = ((Number(coin[1].curr_price) - coin[1].cost_basis) * coin[1].hodl).toFixed(2);
            const curr_price = Number(coin[1].curr_price).toFixed(2);
            const color = gain_loss >= 0 ? "green" : "red";
            return (
              <div key={i} className="coin">
                <p className="float-left">
                  {ticker}<br/>
                  <span>{hodl} Coins</span>
                </p>
                <p className="text-right float-right">
                  <span className={color}>${this._numberWithCommas(gain_loss)}</span><br/>
                  <span>${this._numberWithCommas(curr_price)}</span>
                </p>
              </div>
            );
          }.bind(this))}
        </div>
      </div>
    );
  }
}

export default App;