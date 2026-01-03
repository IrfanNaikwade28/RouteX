from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import ClientRegistrationSerializer, ClientLoginSerializer, ClientSerializer


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class ClientRegistrationView(APIView):
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ClientRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            client = serializer.save()
            tokens = get_tokens_for_user(client)
            
            return Response({
                'message': 'Client registered successfully',
                'client': ClientSerializer(client).data,
                'tokens': tokens
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'message': 'Registration failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ClientLoginView(APIView):
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ClientLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            
            return Response({
                'message': 'Login successful',
                'client': ClientSerializer(user).data,
                'tokens': tokens
            }, status=status.HTTP_200_OK)
        
        return Response({
            'message': 'Login failed',
            'errors': serializer.errors
        }, status=status.HTTP_401_UNAUTHORIZED)
