import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CustomerDashboard from './pages/CustomerDashboard';
import FindAccount from './pages/FindAccount';
import RequestBus from './pages/RequestBus';
import Chat from './pages/ChatRoom';
import OrderHistoryCustomer from './pages/PastTripListCustomer';
import OrderDetailCustomer from './pages/PastTripDetailCustomer';
import ReviewPendingList from './pages/ReviewPendingListCustomer';
import AddReview from './pages/SubmitReviewCustomer';
import ReviewDetail from './pages/ReviewDetailCustomer';
import ReservationList from './pages/ReservationList';
import ReservationDetail from './pages/ReservationDetailCustomer';
import CancelReservation from './pages/CancelReservation';
import ProfileCustomer from './pages/ProfileCustomer';

import DriverDashboard from './pages/DriverDashboard';
import DriverInfoRegistration from './pages/DriverInfoRegistration';
import BusInfoRegistration from './pages/BusInfoRegistration';
import EstimateListDriver from './pages/EstimateListDriver';
import EstimateDetailDriver from './pages/EstimateDetailDriver';
import UpcomingTripsDriver from './pages/UpcomingTripsDriver';
import UpcomingTripDetailDriver from './pages/UpcomingTripDetailDriver';
import ContractCancelDriver from './pages/ContractCancelDriver';
import ApprovalPendingDriver from './pages/ApprovalPendingDriver';
import BidDetailDriver from './pages/BidDetailDriver';
import CompletedTripsDriver from './pages/CompletedTripsDriver';
import CompletedTripDetailDriver from './pages/CompletedTripDetailDriver';
import RatingReplyDriver from './pages/RatingReplyDriver';
import FailBidListDriver from './pages/FailBidListDriver';
import FailBidDetailDriver from './pages/FailBidDetailDriver';
import ChatListDriver from './pages/ChatListDriver';
import SettlementHistoryDriver from './pages/SettlementHistoryDriver';
import PassSelectDriver from './pages/PassSelectDriver';
import CardMembershipMgmtDriver from './pages/CardMembershipMgmtDriver';
import CardRegisterDriver from './pages/CardRegisterDriver';

// Customer Screens
import EstimateListCustomer from './pages/EstimateListCustomer';
import EstimateRequestListCustomer from './pages/EstimateRequestListCustomer';
import EstimateDetailCustomer from './pages/EstimateDetailCustomer';
import ApprovalListCustomer from './pages/ApprovalListCustomer';
import ApprovalDetailCustomer from './pages/ApprovalDetailCustomer';
import InquiryListCustomer from './pages/InquiryListCustomer';
import InquiryDetailCustomer from './pages/InquiryDetailCustomer';
import InquiryForm from './pages/InquiryForm';

// 페이지 준비 중 표시를 위한 공통 컴포넌트
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center font-body">
    <span className="material-symbols-outlined text-primary text-6xl mb-4">construction</span>
    <h1 className="text-3xl font-extrabold text-teal-900 mb-2 font-headline">{title}</h1>
    <p className="text-on-surface-variant max-w-md font-bold">해당 기능은 현재 구현 중입니다. <br/> 곧 멋진 모습으로 찾아뵙겠습니다!</p>
    <button 
      onClick={() => window.history.back()}
      className="mt-8 bg-primary text-white font-black py-4 px-10 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
    >
      이전 화면으로 돌아가기
    </button>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* 핵심 인증 라우트 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/find-account" element={<FindAccount />} />
        
        {/* 고객용 라우트 */}
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
        <Route path="/request-bus" element={<RequestBus />} />
        <Route path="/order-history" element={<OrderHistoryCustomer />} />
        <Route path="/order-detail/:id" element={<OrderDetailCustomer />} />
        <Route path="/review-pending-list" element={<ReviewPendingList />} />
        <Route path="/add-review/:id" element={<AddReview />} />
        <Route path="/review-detail/:id" element={<ReviewDetail />} />
        <Route path="/reservation-list" element={<ReservationList />} />
        <Route path="/reservation-detail/:id" element={<ReservationDetail />} />
        <Route path="/cancel-reservation" element={<CancelReservation />} />
        <Route path="/user-profile" element={<ProfileCustomer />} />
        <Route path="/estimate-list" element={<EstimateListCustomer />} />
        <Route path="/estimate-request-list" element={<EstimateRequestListCustomer />} />
        <Route path="/estimate-detail/:id" element={<EstimateDetailCustomer />} />
        <Route path="/approval-list" element={<ApprovalListCustomer />} />
        <Route path="/approval-detail/:id" element={<ApprovalDetailCustomer />} />
        <Route path="/inquiry-list" element={<InquiryListCustomer />} />
        <Route path="/add-inquiry" element={<InquiryForm />} />
        <Route path="/inquiry-detail/:id" element={<InquiryDetailCustomer />} />
        
        {/* 기사님용 라우트 */}
        <Route path="/driver-dashboard" element={<DriverDashboard />} />
        <Route path="/driver-certification" element={<DriverInfoRegistration />} />
        <Route path="/bus-certification" element={<BusInfoRegistration />} />
        <Route path="/estimate-list-driver" element={<EstimateListDriver />} />
        <Route path="/estimate-detail-driver/:id" element={<EstimateDetailDriver />} />
        <Route path="/upcoming-trips-driver" element={<UpcomingTripsDriver />} />
        <Route path="/upcoming-trip-detail-driver/:id" element={<UpcomingTripDetailDriver />} />
        <Route path="/contract-cancel-driver" element={<ContractCancelDriver />} />
        <Route path="/approval-pending-driver" element={<ApprovalPendingDriver />} />
        <Route path="/bid-detail-driver/:id" element={<BidDetailDriver />} />
        <Route path="/completed-trips-driver" element={<CompletedTripsDriver />} />
        <Route path="/completed-trip-detail-driver/:id" element={<CompletedTripDetailDriver />} />
        <Route path="/rating-reply-driver/:id" element={<RatingReplyDriver />} />
        <Route path="/failed-estimate-list-driver" element={<FailBidListDriver />} />
        <Route path="/fail-bid-detail-driver/:id" element={<FailBidDetailDriver />} />
        <Route path="/chat-list-driver" element={<ChatListDriver />} />
        <Route path="/payment-history-driver" element={<SettlementHistoryDriver />} />
        <Route path="/pass-select-driver" element={<PassSelectDriver />} />
        <Route path="/membership-card-mgmt" element={<CardMembershipMgmtDriver />} />
        <Route path="/card-register" element={<CardRegisterDriver />} />

        {/* 공통 라우트 */}
        <Route path="/chat-room/:id" element={<Chat />} />
      </Routes>
    </Router>
  );
}

export default App;
