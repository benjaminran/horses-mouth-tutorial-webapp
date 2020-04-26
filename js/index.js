var app;
(function() {
    'use strict';

    var backendEndpoint = 'http://localhost:5000';
    var backendPollInterval = 5000; // 15000

    app = new Vue({
        el: '#app',
        data: {
            loadingTopics: true,
            topics: {},
            showSubscribedOnly: false,
            newTopicFormVisible: false,
            newTopic: {
                name: '',
                description: '',
                sound: ''
            }
        },
        methods: {
            toggleShowSubscribedOnly: function() {
                app.showSubscribedOnly = !app.showSubscribedOnly;
            },
            showNewTopicForm: function(){
                app.newTopicFormVisible = true;
            },
            createNewTopic: function() {
                $.ajax({
                    type: 'POST',
                    url: backendEndpoint + '/topics/',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        name: app.newTopic.name,
                        description: app.newTopic.description,
                        sound: app.newTopic.sound
                    }),
                    dataType: 'json',
                    success: function (data, textStatus, jqXHR) {
                        console.log("createNewTopic status: " + textStatus);
                        console.log(data);
                        app.topics[data.topic.id].lastNotification = data.time;
                        refreshTopics();
                        app.newTopicFormVisible = false;
                        app.newTopic.name = '';
                        app.newTopic.description = '';
                        app.newTopic.sound = '';
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        console.log('createNewTopic status: ' + textStatus + ': ' + errorThrown);
                    }
                });
            },
            playSound: function(topicId) {
                var audio = document.getElementById('sound-'+topicId);
                audio.currentTime = 0;
                audio.play();
            },
            notify: function(topicId) {
                $.ajax({
                    type: 'PUT',
                    url: backendEndpoint + '/topics/'+topicId,
                    dataType: 'json',
                    success: function (data, textStatus, jqXHR) {
                        console.log("notify status: " + textStatus);
                        console.log(data);
                        app.topics[topicId].lastUpdateTime = data.time;
                    },
                    error: function (jqXHR, textStatus, errorThrown) {

                        console.log('notify status: ' + textStatus + ': ' + errorThrown);
                    }
                });
            }
        }
    });

    var checkSubscriptions = function() {
        var subscriptions = Object.values(app.topics)
            .filter(function(topic){return topic.subscribed;})
            .map(function(topic){return topic.id});
        for(var i=0; i<subscriptions.length; i++) {
            (function(){
                var topicId = subscriptions[i];
                $.getJSON(backendEndpoint+'/topics/'+topicId, function (data) {
                    var topic = app.topics[topicId];
                    if(topic.lastNotification !== 0) {
                        var newEvents = data.topic.events.filter(function (event) {
                            return event > topic.lastNotification;
                        });
                        newEvents.forEach(function (event) {
                            // play a sound
                            console.log('update for topic ' + topic.name + ' (' + topicId + ') at timestamp ' + event);
                            app.playSound(topicId);
                        });
                    }
                    console.log(data);
                    app.topics[topicId].lastNotification = data.time;
                });
            })();

        }
    };

    var refreshTopics = function() {
        // app.loadingTopics = true;
        $.ajax({
            type: 'GET',
            url: backendEndpoint + '/topics/',
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                console.log("refresh status: " + textStatus);
                console.log(data);
                var topics = {};
                data.topics.forEach(function(topic, index, arr){
                    topic.subscribed = topic.id in app.topics && app.topics[topic.id].subscribed;
                    topic.lastNotification = topic.id in app.topics ? app.topics[topic.id].lastNotification : 0;
                    topics[topic.id] = topic;
                });
                app.loadingTopics = false;
                app.topics = topics;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log('topics refresh status: ' + textStatus + ': ' + errorThrown);
            }
        });
    };

    refreshTopics();

    window.setInterval(function(){
        console.log('polling topics/subscriptions for updates...');
        checkSubscriptions();
        refreshTopics();
    }, backendPollInterval);
})();