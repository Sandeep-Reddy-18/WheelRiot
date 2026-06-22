const axios = require('axios');
const Setting = require('../models/Setting');

class ShipRocketService {
  constructor() {
    this.baseUrl = 'https://apiv2.shiprocket.in/v1/external';
    this.token = null;
    this.tokenExpiry = null;
  }

  async getCredentials() {
    let email = process.env.SHIPROCKET_EMAIL;
    let password = process.env.SHIPROCKET_PASSWORD;
    
    try {
        const emailSetting = await Setting.findOne({ key: 'shipRocketEmail' });
        if (emailSetting?.value) email = emailSetting.value;
        const passwordSetting = await Setting.findOne({ key: 'shipRocketPassword' });
        if (passwordSetting?.value) password = passwordSetting.value;
    } catch (e) { }
    
    if (!email || !password) {
      throw new Error('ShipRocket credentials not configured in Admin Settings or .env');
    }
    
    return { email, password };
  }

  async login() {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    const creds = await this.getCredentials();

    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, creds);
      this.token = response.data.token;
      const now = new Date();
      now.setDate(now.getDate() + 9); 
      this.tokenExpiry = now;
      
      console.log('✅ ShipRocket Login Successful');
      return this.token;
    } catch (error) {
      console.error('ShipRocket Login Failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with ShipRocket');
    }
  }

  async isAuthenticated() {
      try {
          await this.getCredentials(); 
          return true;
      } catch (e) {
          return false;
      }
  }

  async getAdminData() {
    const token = await this.login();
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    const [wallet, locations] = await Promise.all([
        axios.get(`${this.baseUrl}/account/details/wallet-balance`, config),
        axios.get(`${this.baseUrl}/settings/company/pickup`, config)
    ]);
    
    return {
        balance: wallet.data.data.wallet_balance,
        pickupLocations: locations.data.data.shipping_address
    };
  }

  async checkServiceability(pickupPostcode, deliveryPostcode, weight, cod) {
    const token = await this.login();
    try {
      const response = await axios.get(`${this.baseUrl}/courier/serviceability`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          pickup_postcode: pickupPostcode,
          delivery_postcode: deliveryPostcode,
          weight: weight,
          cod: cod // 1 or 0
        }
      });
      
      if (response.data && response.data.status === 200) {
          return response.data;
      } else {
          throw new Error(response.data.message || 'Serviceability Check Failed');
      }
    } catch (error) {
       console.error('Serviceability Check Failed:', error.response?.data || error.message);
       
       const errMsg = error.response?.data?.message || error.message;
       
       if (errMsg.includes('Insufficient balance')) {
           throw new Error('ShipRocket Wallet Low: Please recharge your account.');
       }
       if (error.response?.status === 401 || errMsg.includes('Unauthenticated')) {
           throw new Error('Authentication Failed: Check ShipRocket Email/Password in Settings.');
       }
       
       throw new Error(errMsg || 'Could not check pincode');
    }
  }

  async createOrder(order, user, pickupLocation = 'Primary', weight = 0.5, length = 10, breadth = 10, height = 10) {
    const token = await this.login();

    // Dynamically override pickup location if configured in Admin Dashboard
    if (pickupLocation === 'Primary') {
        try {
            const pickupSetting = await Setting.findOne({ key: 'shipRocketPickupLocation' });
            if (pickupSetting && pickupSetting.value) {
                pickupLocation = pickupSetting.value;
            }
        } catch (e) {}
    }

    const orderData = {
      order_id: order._id.toString(),
      order_date: new Date(order.createdAt).toISOString().split('T')[0] + ' ' + new Date(order.createdAt).toTimeString().split(' ')[0],
      pickup_location: pickupLocation, 
      billing_customer_name: (order.shippingAddress.label || order.shippingAddress.fullName || 'Guest').split(' ')[0],
      billing_last_name: (order.shippingAddress.label || order.shippingAddress.fullName || 'Customer').split(' ').slice(1).join(' '),
      billing_address: order.shippingAddress.street,
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.zip,
      billing_state: order.shippingAddress.state || 'Delhi', 
      billing_country: 'India',
      billing_email: user?.email || order.shippingAddress.email || 'guest@wheelriot.com',
      billing_phone: order.shippingAddress.phone.slice(-10),
      shipping_is_billing: true,
      order_items: order.items.map(item => ({
        name: item.name,
        sku: item.sku || 'N/A',
        units: item.quantity,
        selling_price: item.price
      })),
      payment_method: order.payment.provider === 'COD' ? 'COD' : 'Prepaid',
      sub_total: order.totalAmount,
      length: length || 10,
      breadth: breadth || 10,
      height: height || 10,
      weight: weight || 0.5
    };

    try {
      console.log('--- SHIPROCKET TRANSMISSION PAYLOAD ---', JSON.stringify(orderData, null, 2));
      const response = await axios.post(`${this.baseUrl}/orders/create/adhoc`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('--- SHIPROCKET RESPONSE SUCCESS ---', response.data);
      return response.data;
    } catch (error) {
      console.error('ShipRocket Create Order Failed:', error.response?.data || error.message);
      let msg = 'ShipRocket Error';
      if (error.response?.data?.errors) {
         msg = JSON.stringify(error.response.data.errors);
      } else if (error.response?.data?.message) {
         msg = error.response.data.message;
      }
      throw new Error(msg);
    }
  }
  
  async createReturnOrder(order) {
       const token = await this.login();
       
       const returnData = {
           order_id: `RET-${order._id.toString()}`,
           order_date: new Date().toISOString().split('T')[0],
           channel_id: "",
           pickup_customer_name: order.shippingAddress.label.split(' ')[0] || 'Customer',
           pickup_last_name: order.shippingAddress.label.split(' ')[1] || '',
           pickup_address: order.shippingAddress.street,
           pickup_city: order.shippingAddress.city,
           pickup_state: order.shippingAddress.state || 'Delhi',
           pickup_country: 'India',
           pickup_pincode: order.shippingAddress.zip,
           pickup_email: 'wheelriot@gmail.com',
           pickup_phone: order.shippingAddress.phone,
           shipping_customer_name: "WheelRiot Returns",
           shipping_last_name: "",
           shipping_address: "Warehouse", 
           shipping_city: "Delhi",
           shipping_country: "India",
           shipping_pincode: "110001",
           shipping_state: "Delhi",
           shipping_email: "wheelriot@gmail.com",
           shipping_phone: "9999999999",
           order_items: order.items.map(item => ({
               name: item.name,
               sku: item.sku || 'RET-ITEM',
               units: item.quantity,
               selling_price: item.price
           })),
           payment_method: "Prepaid",
           sub_total: order.totalAmount,
           length: 10, breadth: 10, height: 10, weight: 0.5
       };

       try {
           const response = await axios.post(`${this.baseUrl}/orders/create/return`, returnData, {
               headers: { Authorization: `Bearer ${token}` }
           });
           return response.data;
       } catch (error) {
           console.error('ShipRocket Create Return Failed:', error.response?.data || error.message);
           throw new Error(error.response?.data?.message || 'Failed to create return order');
       }
  }
}

module.exports = new ShipRocketService();
