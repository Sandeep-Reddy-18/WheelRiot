
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import useCartStore from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Truck, Check, ChevronRight, CheckCircle, Package, ArrowLeft, Plus, Shield, RefreshCw } from 'lucide-react';

const countries = [
  { code: 'IN', name: 'India', dial_code: '+91', flag: '🇮🇳', phone_len: 10 },
  { code: 'US', name: 'USA', dial_code: '+1', flag: '🇺🇸', phone_len: 10 },
  { code: 'GB', name: 'UK', dial_code: '+44', flag: '🇬🇧', phone_len: 10 }, 
  { code: 'CA', name: 'Canada', dial_code: '+1', flag: '🇨🇦', phone_len: 10 },
  { code: 'AU', name: 'Australia', dial_code: '+61', flag: '🇦🇺', phone_len: 9 },
  { code: 'DE', name: 'Germany', dial_code: '+49', flag: '🇩🇪', phone_len: 11 },
  { code: 'JP', name: 'Japan', dial_code: '+81', flag: '🇯🇵', phone_len: 10 },
  { code: 'AE', name: 'UAE', dial_code: '+971', flag: '🇦🇪', phone_len: 9 },
];

const Checkout = () => {
  const { items, total, clearCart } = useCartStore();
  const { user, loginUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('');
  const [step, setStep] = useState(1); 
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1); 
  const [saveAddress, setSaveAddress] = useState(false);
  
  // OS Map Autocomplete states
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    label: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
    phone: '',
    email: '' 
  });

  const [shippingRules, setShippingRules] = useState({
      flatRate: 40,
      freeThreshold: 1000,
      premiumSurcharge: 150
  });
  const [shippingMethod, setShippingMethod] = useState('Standard'); // 'Standard' | 'Premium'

  // Serviceability State
  const [isServiceable, setIsServiceable] = useState(null);
  const [serviceCheckLoading, setServiceCheckLoading] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [codEnabled, setCodEnabled] = useState(true);

  // Billing Address State
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingData, setBillingData] = useState({
    fullName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
    phone: '',
    email: '' 
  });
  const [selectedBillingCountry, setSelectedBillingCountry] = useState(countries[0]);
  const [billingPhoneError, setBillingPhoneError] = useState('');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Razorpay'); // 'Razorpay' | 'COD'
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  
  // Checkout UX states
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  
  const COD_FEE = 100;

  // Country State
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    fetchShippingRules();
    if (user) {
        setSavedAddresses(user.addresses || []);
        if (user.addresses?.length > 0) {
            setSelectedAddressIndex(0);
            setFormData(prev => ({ ...prev, ...user.addresses[0], email: user.email }));
        } else {
            setFormData(prev => ({ ...prev, email: user.email, fullName: user.fullName || '' }));
        }
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
        if (!e.target.closest('.osm-autocomplete-container')) {
            setShowSuggestions(false);
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchShippingRules = async () => {
      try {
          const [rate, threshold, surcharge, codState] = await Promise.all([
              axios.get('/api/settings/shippingFlatRate'),
              axios.get('/api/settings/shippingFreeThreshold'),
              axios.get('/api/settings/shippingPremiumSurcharge'),
              axios.get('/api/settings/codEnabled')
          ]);
          setShippingRules({
              flatRate: rate.data !== null ? rate.data : 40,
              freeThreshold: threshold.data !== null ? threshold.data : 1000,
              premiumSurcharge: surcharge.data !== null ? surcharge.data : 150
          });
          setCodEnabled(codState.data !== false);
      } catch (err) {
          console.error('Failed to load shipping rules', err);
      }
  };

  useEffect(() => {
    if (formData.country) {
        const c = countries.find(co => co.name === formData.country);
        if(c) setSelectedCountry(c);
    }
  }, [formData.country]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, country: selectedCountry.name }));
  }, [selectedCountry]);

  useEffect(() => {
      setIsCalculatingPrice(true);
      const timer = setTimeout(() => setIsCalculatingPrice(false), 500);
      return () => clearTimeout(timer);
  }, [shippingMethod, appliedCoupon]);

  const handleApplyCoupon = async () => {
      setCouponError('');
      try {
          const res = await axios.post('/api/coupons/verify', {
              code: couponCode,
              cartItems: items.map(i => ({...i, brand: i.manufacturer})), 
              totalAmount: total()
          });
          setDiscount(res.data.discount);
          setAppliedCoupon(res.data.code);
          setCouponError('');
      } catch (err) {
          setCouponError(err.response?.data?.error || 'Invalid Promo Code');
          setDiscount(0);
          setAppliedCoupon(null);
      }
  };

  const calculateTotal = () => total();

  const calculateShipping = () => {
      const subTotal = calculateTotal(); 
      let cost = 0;
      
      // Standard Cost
      if (subTotal < shippingRules.freeThreshold) {
          cost = shippingRules.flatRate;
      }
      
      // Premium Surcharge
      if (shippingMethod === 'Premium') {
          cost += shippingRules.premiumSurcharge;
      }
      
      return cost;
  };

  const finalTotal = () => {
      return Math.max(0, calculateTotal() - discount + calculateShipping());
  };

  const handlePinBlur = async (e) => {
      const val = e.target.value;
      if (!val || val.length < 5) return;
      
      setServiceCheckLoading(true);
      try {
          const res = await axios.post('/api/shipping/serviceability', {
              pincode: val,
              weight: items.length * 0.5,
              cod: paymentMethod === 'COD' ? 1 : 0
          });
          
          if (res.data.deliverable) {
              setIsServiceable(true);
              setServiceError('');
              setFormData(prev => ({
                  ...prev,
                  city: res.data.city || prev.city,
                  state: res.data.state || prev.state
              }));
          } else {
              setIsServiceable(false);
              if (res.data.error === "ShipRocket credentials not configured in Admin Settings.") {
                  setServiceError('Contact admin, pincode checker not working.');
              } else {
                  setServiceError('This pincode is not serviceable currently.');
              }
          }
      } catch (err) {
          setIsServiceable(false);
          setServiceError('Failed to verify pincode.');
      } finally {
          setServiceCheckLoading(false);
      }
  };

  const handleAddressChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, street: val });
    
    if (val.length < 3) {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    setAddressLoading(true);
    setShowSuggestions(true);
    
    searchTimeoutRef.current = setTimeout(async () => {
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: val,
                    format: 'json',
                    addressdetails: 1,
                    limit: 5
                },
                headers: {
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            setAddressSuggestions(res.data);
        } catch (err) {
            console.error("OSM Error:", err);
            setAddressSuggestions([]);
        } finally {
            setAddressLoading(false);
        }
    }, 500);
  };

  const handleAddressSelectAPI = (suggestion) => {
    const { address, display_name } = suggestion;
    
    let city = address.city || address.town || address.village || address.county || '';
    let state = address.state || '';
    let zip = address.postcode || '';
    let country = address.country || '';

    const updatedForm = { ...formData, street: display_name };
    if (city) updatedForm.city = city;
    if (state) updatedForm.state = state;
    if (zip) updatedForm.zip = zip;
    
    setFormData(updatedForm);
    setShowSuggestions(false);
    
    if (country) {
        const matchedCountry = countries.find(c => c.name.toLowerCase() === country.toLowerCase() || c.code.toLowerCase() === country.toLowerCase());
        if (matchedCountry) setSelectedCountry(matchedCountry);
    }
    
    if (zip && zip.length >= 5) {
        handlePinBlur({ target: { value: zip } });
    }
  };

  const handlePhoneChange = (e, isBilling = false) => {
        let val = e.target.value;
        const currentCountry = isBilling ? selectedBillingCountry : selectedCountry;
        const setCountry = isBilling ? setSelectedBillingCountry : setSelectedCountry;
        const setError = isBilling ? setBillingPhoneError : setPhoneError;
        const setData = isBilling ? setBillingData : setFormData;
        const currentData = isBilling ? billingData : formData;

        const matchedCountry = countries.find(c => val.startsWith(c.dial_code));
        if (matchedCountry && matchedCountry.code !== currentCountry.code) {
             setCountry(matchedCountry);
        }
        
        const activeCountry = (matchedCountry && matchedCountry.code !== currentCountry.code) ? matchedCountry : currentCountry;
        
        const dialCode = activeCountry.dial_code;
        let raw = val;
        if (raw.startsWith(dialCode)) {
            raw = raw.substring(dialCode.length);
        }
        const digits = raw.replace(/\D/g, '');
        if (digits.length !== activeCountry.phone_len && digits.length > 0) {
            setError(`Expected ${activeCountry.phone_len} digits`);
        } else {
            setError('');
        }
        setData({ ...currentData, phone: val });
  };

  const handleChange = (e, isBilling = false) => {
      if (isBilling) {
         setBillingData({ ...billingData, [e.target.name]: e.target.value });
      } else {
         setFormData({ ...formData, [e.target.name]: e.target.value });
      }
  };

  const handleAddressSelect = (index) => {
      setSelectedAddressIndex(index);
      if (index === -1) {
          const defaultCountry = countries.find(c => c.name === 'India') || countries[0];
          setSelectedCountry(defaultCountry);
          setFormData({
            label: 'Home',
            street: '',
            city: '',
            state: '',
            zip: '',
            country: defaultCountry.name,
            phone: '',
            email: user?.email || ''
          });
      } else {
          const addr = savedAddresses[index];
          const foundCountry = countries.find(c => c.name === addr.country) || countries[0];
          setSelectedCountry(foundCountry);
          setFormData({ ...addr, email: user?.email || '' });
      }
  };

  const handleNextStep = (e) => {
      e.preventDefault();
      if (phoneError) return alert("Please fix shipping phone number error");
      if (!billingSameAsShipping && billingPhoneError) return alert("Please fix billing phone number error");
      if (isServiceable === false) return alert("Please enter a serviceable shipping pincode to proceed.");
      setStep(2); 
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setSubmissionError('');

    try {
      let finalPhone = formData.phone.trim();
      if (!finalPhone.startsWith('+')) {
          finalPhone = `${selectedCountry.dial_code} ${finalPhone}`;
      }
      
      let finalBillingPhone = billingData.phone.trim();
      if (!billingSameAsShipping) {
          if (!finalBillingPhone.startsWith('+')) {
              finalBillingPhone = `${selectedBillingCountry.dial_code} ${finalBillingPhone}`;
          }
      }

      const orderPayload = {
        items: items.map(item => ({
          product: item._id,
          name: item.name,
          pimg: item.images[0],
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: finalTotal(),
        discountApplied: discount,
        couponCode: appliedCoupon,
        shippingAddress: {
            ...formData,
            country: selectedCountry.name,
            phone: finalPhone
        },
        billingAddress: billingSameAsShipping ? null : {
            ...billingData,
            country: selectedBillingCountry.name,
            phone: finalBillingPhone
        },
        shipping: {
            method: shippingMethod,
            cost: calculateShipping()
        },
        payment: {
            provider: paymentMethod,
            status: 'pending'
        },
        userId: user ? (user._id || user.id) : null,
        saveAddress
      };

      let orderId, rzpOrderId, totalCost;

      const res = await axios.post('/api/orders', orderPayload);
      orderId = res.data.order ? res.data.order._id : res.data._id;
      
      if (res.data.updatedAddresses && user) {
          const updatedUser = { ...user, addresses: res.data.updatedAddresses };
          if (loginUser) loginUser(updatedUser, localStorage.getItem('token'));
          localStorage.setItem('user', JSON.stringify(updatedUser));
      }
          
      if (paymentMethod === 'Razorpay' && res.data.razorpayOrder) {
          rzpOrderId = res.data.razorpayOrder.id;
              if (!document.getElementById('razorpay-script')) {
                  const script = document.createElement('script');
                  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                  script.id = 'razorpay-script';
                  document.body.appendChild(script);
                  
                  await new Promise(resolve => script.onload = resolve);
              }

              let rzpKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_ID';
              try {
                  const keyRes = await axios.get('/api/settings/razorpayKeyId');
                  if (keyRes.data) rzpKeyId = keyRes.data;
              } catch (e) {
                  console.error("Failed to fetch Razorpay Key ID", e);
              }

              console.log(`[Checkout UI] Launching Razorpay Gateway! Config params: Amount=${res.data.razorpayOrder.amount}, internalOrder=${orderId}`);
              const options = {
                  "key": rzpKeyId,
                  "amount": res.data.razorpayOrder.amount,
                  "currency": "INR",
                  "name": "WheelRiot",
                  "description": "Order #" + orderId,
                  "image": window.location.origin + "/wheelriot_full-logo.png",
                  "order_id": rzpOrderId,
                  "timeout": 100,
                  "config": {
                      "display": {
                          "blocks": {
                              "banks": {
                                  "name": "Pay using Card or UPI",
                                  "instruments": [
                                      { "method": "upi" },
                                      { "method": "card" }
                                  ]
                              }
                          },
                          "sequence": ["block.banks"],
                          "preferences": {
                              "show_default_blocks": false
                          }
                      }
                  },
                  "modal": {
                      "ondismiss": async function() {
                          console.log(`[Checkout UI] Razorpay window intentionally dismissed by user. Order ID: ${orderId}`);
                          setLoading(false);
                          setRedirectMessage("Redirecting to orders page...");
                          setVerifyingPayment(true);
                          
                          try {
                              console.log(`[Checkout UI] Pinging server to mask Order ${orderId} as payment_failed...`);
                              await axios.post('/api/orders/payment-failed', {
                                  orderId: orderId,
                                  errorDetails: { description: 'User dismissed the payment gateway popup' }
                              });
                          } catch(err) {
                              console.error('[Checkout UI] Failed masking dismissed order:', err);
                          }
                          
                          setTimeout(() => {
                              window.location.href = '/profile';
                          }, 5000);
                      }
                  },
                  "handler": async function (response) {
                      try {
                          console.log("[Checkout UI] Success callback from Razorpay received. Verifying...");
                          setVerifyingPayment(true);
                          const verifyRes = await axios.post('/api/orders/verify-payment', {
                              orderId: orderId,
                              razorpay_payment_id: response.razorpay_payment_id,
                              razorpay_order_id: response.razorpay_order_id,
                              razorpay_signature: response.razorpay_signature,
                              saveAddress: saveAddress
                          });
                          
                          if (verifyRes.data.success) {
                              console.log("[Checkout UI] Verification successful! Clearing cart and navigating...");
                              if (saveAddress && user) {
                                  let existing = user.addresses || [];
                                  const isDupe = existing.some(a => a.street === orderPayload.shippingAddress.street && a.phone === orderPayload.shippingAddress.phone);
                                  if(!isDupe) {
                                      const updatedUser = { ...user, addresses: [...existing, orderPayload.shippingAddress] };
                                      localStorage.setItem('user', JSON.stringify(updatedUser));
                                  }
                              }
                              clearCart();
                              navigate(`/order-success/${orderId}`);
                          } else {
                              console.error("[Checkout UI] Verification failed according to server.");
                              setSubmissionError('Payment verification failed. Please check your order history.');
                              setVerifyingPayment(false);
                              setTimeout(() => navigate('/profile'), 3000);
                          }
                      } catch (err) {
                          console.error("[Checkout UI] Fatal error during verification:", err);
                          setSubmissionError('Payment verification error. Your order is pending in your profile.');
                          setVerifyingPayment(false);
                          setTimeout(() => navigate('/profile'), 3000);
                      }
                  },
                  "prefill": {
                      "name": formData.fullName,
                      "email": formData.email,
                      "contact": formData.phone
                  },
                  "theme": {
                      "color": "#DB0000" 
                  }
              };

              const rzp = new window.Razorpay(options);
              rzp.on('payment.failed', async function (response){
                  try {
                      await axios.post('/api/orders/payment-failed', {
                          orderId: orderId,
                          errorDetails: response.error
                      });
                  } catch(e) { console.error('Failed to notify server of payment failure'); }
                  setSubmissionError(`Payment Failed: ${response.error.description}. You can try again.`);
              });
              rzp.open();
              
          } else {
             // COD Flow
             if (saveAddress && user) {
                 let existing = user.addresses || [];
                 const isDupe = existing.some(a => a.street === orderPayload.shippingAddress.street && a.phone === orderPayload.shippingAddress.phone);
                 if(!isDupe) {
                     const updatedUser = { ...user, addresses: [...existing, orderPayload.shippingAddress] };
                     localStorage.setItem('user', JSON.stringify(updatedUser));
                 }
             }
             clearCart();
             navigate(`/order-success/${orderId}`);
          }
      } catch (err) {
          console.error(err);
          setSubmissionError('Order Failed: ' + (err.response?.data?.error || err.message));
      } finally {
          setLoading(false);
      }
  };

  if (items.length === 0) {
    return (
      <div className="pt-32 text-center px-4">
        <h2 className="text-2xl font-bold mb-4">Your garage is empty.</h2>
        <button onClick={() => navigate('/shop')} className="text-primary hover:underline">
          Go back to showroom
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Secure Checkout</h1>
      
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left: Steps */}
        <div className="flex-1 space-y-8">
            
          {/* STEP 1: ADDRESS */}
          <div className={`bg-surface p-6 rounded-xl border ${step === 1 ? 'border-primary/50 ring-1 ring-primary/20' : 'border-white/10 opacity-60'}`}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 1 ? 'bg-primary text-white' : 'bg-gray-700 text-gray-400'}`}>1</div>
              Shipping Details
            </h2>

            {step === 1 && (
                <div className="space-y-6">
                    {savedAddresses.length === 0 && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 text-sm text-primary flex items-start gap-3">
                            <Truck size={18} className="mt-0.5 flex-shrink-0" />
                            <p>No saved addresses found. Please enter a new shipping address below to proceed.</p>
                        </div>
                    )}
                    {savedAddresses.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {savedAddresses.map((addr, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => handleAddressSelect(idx)}
                                    className={`cursor-pointer p-4 rounded-lg border flex items-start gap-3 transition-all ${selectedAddressIndex === idx ? 'bg-primary/10 border-primary' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                >
                                    <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${selectedAddressIndex === idx ? 'border-primary' : 'border-gray-500'}`}>
                                        {selectedAddressIndex === idx && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm mb-1">{addr.label}</div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            {addr.street}, {addr.city}<br/>
                                            {addr.state} - {addr.zip}<br/>
                                            Phone: {addr.phone}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div 
                                onClick={() => handleAddressSelect(-1)}
                                className={`cursor-pointer p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${selectedAddressIndex === -1 ? 'bg-primary/10 border-primary' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                            >
                                <Plus size={24} className="text-gray-400" />
                                <span className="text-sm font-bold text-gray-400">Add New Address</span>
                            </div>
                        </div>
                    )}

                    {(selectedAddressIndex === -1) && (
                        <form id="address-form" onSubmit={handleNextStep} className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
                            <label className="md:col-span-2 block space-y-1">
                                <span className="text-sm font-bold text-gray-300">Email Address <span className="text-red-500">*</span></span>
                                <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required type="email" />
                            </label>
                            <label className="md:col-span-2 block space-y-1">
                                <span className="text-sm font-bold text-gray-300">Full Name <span className="text-red-500">*</span></span>
                                <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Name" className="w-full bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                            </label>
                            <label className="md:col-span-2 block space-y-1">
                                <span className="text-sm font-bold text-gray-300">Address Label (Optional)</span>
                                <input name="label" value={formData.label} onChange={handleChange} placeholder="e.g. Home, Office" className="w-full bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" />
                            </label>
                            
                            <label className="md:col-span-2 block space-y-1 relative osm-autocomplete-container">
                                <span className="text-sm font-bold text-gray-300">Street Address or Landmark <span className="text-red-500">*</span></span>
                                <input
                                    name="street"
                                    value={formData.street}
                                    onChange={handleAddressChange}
                                    placeholder="Street Address"
                                    className="w-full bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none"
                                    required
                                    autoComplete="off"
                                />
                                {showSuggestions && (formData.street.length >= 3) && (
                                    <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-white/10 shadow-xl overflow-hidden rounded-lg top-full">
                                        {addressLoading && <div className="p-3 text-sm text-gray-400">Searching maps...</div>}
                                        {!addressLoading && addressSuggestions.length === 0 && <div className="p-3 text-sm text-gray-500">No matches found. Try being more specific.</div>}
                                        {addressSuggestions.map((suggestion, idx) => (
                                            <div
                                                key={idx}
                                                className="cursor-pointer p-3 bg-transparent text-gray-300 hover:bg-white/10 border-b border-white/5 last:border-0"
                                                onClick={() => handleAddressSelectAPI(suggestion)}
                                            >
                                                <div className="font-medium text-sm text-white">{suggestion.display_name.split(',')[0]}</div>
                                                <div className="text-xs text-gray-500 truncate">{suggestion.display_name.split(',').slice(1).join(',')}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </label>

                            <label className="block space-y-1">
                                <span className="text-sm font-bold text-gray-300">City <span className="text-red-500">*</span></span>
                                <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="w-full bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                            </label>
                            <label className="block space-y-1">
                                <span className="text-sm font-bold text-gray-300">State / Region <span className="text-red-500">*</span></span>
                                <input name="state" value={formData.state} onChange={handleChange} placeholder="State" className="w-full bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                            </label>
                            
                            <div className="md:col-span-2 grid grid-cols-1 gap-2">
                                 <div className="flex gap-2">
                                     <div className="relative w-24">
                                         <select 
                                            className="w-full appearance-none bg-black/30 border border-white/10 rounded-l-lg py-3 pl-3 pr-8 focus:border-primary outline-none cursor-pointer h-full"
                                            value={selectedCountry.code}
                                            onChange={(e) => setSelectedCountry(countries.find(c => c.code === e.target.value))}
                                         >
                                             {countries.map(c => (
                                                 <option key={c.code} value={c.code}>{c.flag} {c.dial_code}</option>
                                             ))}
                                         </select>
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-gray-500">▼</div>
                                     </div>
                                     <input 
                                        name="phone" 
                                        value={formData.phone} 
                                        onChange={handlePhoneChange} 
                                        placeholder={`Phone Number`} 
                                        className={`flex-1 bg-black/30 border ${phoneError ? 'border-red-500' : 'border-white/10'} rounded-r-lg p-3 focus:border-primary outline-none`} 
                                        required 
                                     />
                                 </div>
                                 {phoneError && <p className="text-red-500 text-xs">{phoneError}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                <select 
                                     name="country" 
                                     value={selectedCountry.code} 
                                     onChange={(e) => setSelectedCountry(countries.find(c => c.code === e.target.value))}
                                     className="bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" 
                                     disabled 
                                >
                                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                                <input name="zip" value={formData.zip} onChange={(e) => handleChange(e, false)} onBlur={handlePinBlur} placeholder="PIN / Zip Code" className="bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                            </div>
                            
                            {/* Serviceability Message */}
                            <div className="md:col-span-2 min-h-[24px]">
                                {serviceCheckLoading && <span className="text-yellow-500 text-sm animate-pulse">Checking deliverability...</span>}
                                {isServiceable === true && <span className="text-green-500 text-sm flex items-center gap-1"><Check size={14}/> Delivery available to this location</span>}
                                {serviceError && <span className="text-red-500 text-sm">{serviceError}</span>}
                            </div>
                            
                            {/* Save Address Toggle */}
                            {user && selectedAddressIndex === -1 && (
                                <div className="md:col-span-2 pt-2 pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={saveAddress}
                                            onChange={(e) => setSaveAddress(e.target.checked)}
                                            className="accent-primary w-4 h-4 cursor-pointer"
                                        />
                                        <span className="text-sm font-medium">Save this address for future orders</span>
                                    </label>
                                </div>
                            )}

                            {/* Billing Address Toggle */}
                            <div className="md:col-span-2 pt-2 border-t border-white/10">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={billingSameAsShipping}
                                        onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                                        className="accent-primary w-4 h-4 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium">Billing address same as shipping</span>
                                </label>
                            </div>

                            {/* Billing Address Form */}
                            {!billingSameAsShipping && (
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-5 rounded-lg border border-white/5 bg-black/20 animate-in fade-in slide-in-from-top-2">
                                    <div className="md:col-span-2 mb-2">
                                        <h3 className="font-bold text-lg text-primary">Billing Details</h3>
                                        <p className="text-xs text-gray-400">Where should we send the invoice?</p>
                                    </div>
                                    <input name="email" value={billingData.email} onChange={(e) => handleChange(e, true)} placeholder="Billing Email" className="md:col-span-2 bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required type="email" />
                                    <input name="fullName" value={billingData.fullName} onChange={(e) => handleChange(e, true)} placeholder="Billing Full Name" className="md:col-span-2 bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                                    <input name="street" value={billingData.street} onChange={(e) => handleChange(e, true)} placeholder="Billing Street Address" className="md:col-span-2 bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                                    <input name="city" value={billingData.city} onChange={(e) => handleChange(e, true)} placeholder="City" className="bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                                    <input name="state" value={billingData.state} onChange={(e) => handleChange(e, true)} placeholder="State" className="bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                                    
                                    <div className="md:col-span-2 grid grid-cols-1 gap-2">
                                         <div className="flex gap-2">
                                             <div className="relative w-24">
                                                 <select 
                                                    className="w-full appearance-none bg-black/30 border border-white/10 rounded-l-lg py-3 pl-3 pr-8 focus:border-primary outline-none cursor-pointer h-full"
                                                    value={selectedBillingCountry.code}
                                                    onChange={(e) => setSelectedBillingCountry(countries.find(c => c.code === e.target.value))}
                                                 >
                                                     {countries.map(c => (
                                                         <option key={c.code} value={c.code}>{c.flag} {c.dial_code}</option>
                                                     ))}
                                                 </select>
                                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-gray-500">▼</div>
                                             </div>
                                             <input 
                                                name="phone" 
                                                value={billingData.phone} 
                                                onChange={(e) => handlePhoneChange(e, true)} 
                                                placeholder={`Phone Number`} 
                                                className={`flex-1 bg-black/30 border ${billingPhoneError ? 'border-red-500' : 'border-white/10'} rounded-r-lg p-3 focus:border-primary outline-none`} 
                                                required 
                                             />
                                         </div>
                                         {billingPhoneError && <p className="text-red-500 text-xs">{billingPhoneError}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                        <select 
                                             name="country" 
                                             value={selectedBillingCountry.code} 
                                             onChange={(e) => setSelectedBillingCountry(countries.find(c => c.code === e.target.value))}
                                             className="bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" 
                                             disabled 
                                        >
                                            {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                        </select>
                                        <input name="zip" value={billingData.zip} onChange={(e) => handleChange(e, true)} placeholder="PIN / Zip Code" className="bg-black/30 border border-white/10 rounded p-3 focus:border-primary outline-none" required />
                                    </div>
                                </div>
                            )}
                            
                            <button type="submit" disabled={isServiceable === false} className="md:col-span-2 mt-4 bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Validated & Proceed
                            </button>
                        </form>
                    )}

                    {selectedAddressIndex !== -1 && (
                        <button onClick={handleNextStep} className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors">
                            Use this Address
                        </button>
                    )}
                </div>
            )}
            
            {step > 1 && (
                <div className="flex justify-between items-center text-sm text-gray-400 pl-10">
                    <p>{formData.street}, {formData.city}...</p>
                    <button onClick={() => setStep(1)} className="text-primary hover:underline">Change</button>
                </div>
            )}
          </div>

          {/* STEP 2: SHIPPING */}
          <div className={`bg-surface p-6 rounded-xl border ${step === 2 ? 'border-primary/50 ring-1 ring-primary/20' : 'border-white/10 opacity-60'}`}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 2 ? 'bg-primary text-white' : 'bg-gray-700 text-gray-400'}`}>2</div>
              Shipping Method
            </h2>
            
            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div 
                        onClick={() => setShippingMethod('Standard')}
                        className={`p-4 border rounded-lg cursor-pointer flex justify-between items-center ${shippingMethod === 'Standard' ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Truck className={shippingMethod === 'Standard' ? 'text-primary' : 'text-gray-400'} />
                            <div>
                                <div className="font-bold">Standard Delivery</div>
                                <div className="text-xs text-gray-400">Reliable road transport (5-7 Days)</div>
                            </div>
                        </div>
                        <div className="font-bold">
                            {calculateTotal() >= shippingRules.freeThreshold ? <span className="text-green-500">FREE</span> : `₹${shippingRules.flatRate}`}
                        </div>
                    </div>

                    <div 
                        onClick={() => setShippingMethod('Premium')}
                        className={`p-4 border rounded-lg cursor-pointer flex justify-between items-center ${shippingMethod === 'Premium' ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Truck className={shippingMethod === 'Premium' ? 'text-primary' : 'text-gray-400'} />
                                <div className="absolute -top-2 -right-2 text-[10px] bg-yellow-500 text-black px-1 rounded font-bold">AIR</div>
                            </div>
                            <div>
                                <div className="font-bold">Premium Air</div>
                                <div className="text-xs text-gray-400">Fastest available air cargo (2-4 Days)</div>
                            </div>
                        </div>
                        <div className="font-bold">
                            {calculateTotal() >= shippingRules.freeThreshold 
                                ? `+₹${shippingRules.premiumSurcharge}` 
                                : `₹${shippingRules.flatRate + shippingRules.premiumSurcharge}`} 
                        </div>
                    </div>

                    <button 
                        onClick={() => setStep(3)}
                        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors mt-4"
                    >
                        Continue to Payment
                    </button>
                </div>
            )}
             {step > 2 && (
                <div className="flex justify-between items-center text-sm text-gray-400 pl-10">
                    <p>{shippingMethod} Shipping</p>
                    <button onClick={() => setStep(2)} className="text-primary hover:underline">Change</button>
                </div>
            )}
          </div>

          {/* STEP 3: PAYMENT */}
          <div className={`bg-surface p-6 rounded-xl border ${step === 3 ? 'border-primary/50 ring-1 ring-primary/20' : 'border-white/10 opacity-60'}`}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 3 ? 'bg-primary text-white' : 'bg-gray-700 text-gray-400'}`}>3</div>
              Payment Method
            </h2>
            
            {step === 3 && (
                <div className="animate-in fade-in slide-in-from-top-4 space-y-4">
                    <div 
                        onClick={() => setPaymentMethod('Razorpay')}
                        className={`p-4 border rounded-lg flex justify-between items-center cursor-pointer ${paymentMethod === 'Razorpay' ? 'border-primary bg-primary/5' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    >
                        <div className="flex items-center gap-3">
                            <CreditCard className={paymentMethod === 'Razorpay' ? 'text-primary' : 'text-gray-400'} />
                            <span className="font-bold">Razorpay Secure</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'Razorpay' ? 'border-primary' : 'border-gray-500'}`}>
                            {paymentMethod === 'Razorpay' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                    </div>
                    
                    <button 
                      onClick={handlePlaceOrder}
                      disabled={loading}
                      className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-6"
                    >
                      {loading ? 'Processing...' : (
                        <>
                          <Shield size={18} />
                          Pay ₹{finalTotal().toLocaleString()}
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-4">By clicking above, you agree to our Terms & Conditions.</p>
                </div>
            )}
          </div>

        </div>

        {/* Right: Summary */}
        <div className="lg:w-1/3">
          <div className={`bg-surface p-6 rounded-xl border ${isCalculatingPrice ? 'border-primary shadow-[0_0_15px_rgba(229,9,20,0.3)]' : 'border-white/10'} sticky top-24 transition-all duration-300`}>
            {submissionError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm font-bold flex items-start gap-2 animate-in slide-in-from-top-2">
                    <span className="mt-0.5 whitespace-nowrap">⚠️</span>
                    <span>{submissionError}</span>
                </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Order Summary</h2>
                {isCalculatingPrice && <div className="text-xs text-primary animate-pulse font-bold flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Updating...</div>}
            </div>
            <div className="space-y-4 mb-6">
              {items.map((item, idx) => (
                <div key={`${item._id}-${idx}`} className="flex justify-between text-sm">
                  <span>
                     <Link to={`/product/${item._id}`} target="_blank" className="hover:text-primary transition-colors hover:underline">
                         {item.name}
                     </Link> <span className="text-gray-500">x{item.quantity}</span>
                  </span>
                  <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Total MRP</span>
                <span>₹{items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}</span>
              </div>
              
              {items.reduce((acc, item) => acc + (item.discount > 0 ? (item.price * (item.discount / 100)) : 0) * item.quantity, 0) > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Discount on MRP</span>
                    <span>-₹{items.reduce((acc, item) => {
                        const discountAmt = item.discount > 0 ? (item.price * (item.discount / 100)) : 0;
                        return acc + (discountAmt * item.quantity);
                    }, 0).toLocaleString()}</span>
                  </div>
              )}
              
               {/* Coupon Input */}
               {!appliedCoupon ? (
                   <div className="py-2">
                       <div className="flex gap-2">
                           <input 
                                value={couponCode} 
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="Promo Code" 
                                className={`bg-black/30 border ${couponError ? 'border-red-500' : 'border-white/10'} rounded px-3 py-1 text-sm flex-1 outline-none focus:border-primary uppercase`}
                           />
                           <button onClick={handleApplyCoupon} className="text-sm font-bold text-primary hover:text-white transition-colors">Apply</button>
                       </div>
                       {couponError && <p className="text-red-500 text-xs mt-1 animate-in fade-in">{couponError}</p>}
                   </div>
               ) : (
                   <div className="flex justify-between text-green-500">
                       <span>Coupon Savings ({appliedCoupon})</span>
                       <div className="flex items-center gap-2">
                           <span>-₹{discount}</span>
                           <button onClick={() => {setDiscount(0); setAppliedCoupon(null); setCouponCode('');}} className="text-red-500 hover:text-white">✕</button>
                       </div>
                   </div>
               )}

              <div className="pt-2">
                  <div className="flex justify-between text-white">
                    <span>Shipping ({shippingMethod})</span>
                    <span>{calculateShipping() === 0 ? 'FREE' : `₹${calculateShipping()}`}</span>
                  </div>
                  {calculateTotal() < shippingRules.freeThreshold && shippingMethod === 'Standard' && (
                      <p className="text-xs text-gray-500 mt-1">Shop for <span className="text-white font-bold">₹{(shippingRules.freeThreshold - calculateTotal()).toLocaleString()}</span> more to unlock Free Shipping!</p>
                  )}
                  {calculateTotal() >= shippingRules.freeThreshold && shippingMethod === 'Standard' && (
                      <p className="text-xs text-green-500 mt-1 font-bold flex items-center gap-1"><Check size={12}/> Free shipping unlocked.</p>
                  )}
              </div>


              <div className="flex justify-between text-xl font-bold pt-4 border-t border-white/10 text-white mt-4">
                <span>Total Amount</span>
                <span>₹{finalTotal().toLocaleString()}</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
               <Shield size={12} /> 100% Secure Payment via Razorpay
            </div>
          </div>
        </div>
      </div>

      {verifyingPayment && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold mb-2 text-white">{redirectMessage || "Verifying Payment..."}</h2>
            <p className="text-gray-400 max-w-md">{redirectMessage ? "" : "Please do not close or refresh this window. We are securely communicating with your bank. This usually takes a few seconds."}</p>
        </div>
      )}
    </div>
  );
};

export default Checkout;
