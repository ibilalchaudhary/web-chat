import { delay } from "redux-saga";
import { all, call, put, race, select, take, takeEvery } from "redux-saga/effects";
import find from "lodash/find";

import { makeChannel } from "../_helpers";

import { 
    SEND_FILE,
    receivedFile,
    receivedFileMeta
} from '../../ducks/files';
import {
    JOINED_ROOM,
    LEAVE_ROOM
} from '../../ducks/rooms';
import { showToast } from '../../ducks/toast';

function* watchJoinRoom(client) {

    yield takeEvery(JOINED_ROOM, function* subscribeToRoomFileNodes(action) {

        let contentNode = 'snippets/' + action.payload.jid + '/content';
        let metaNode = 'snippets/' + action.payload.jid + '/metadata';

        // TODO refactor this
        let contentNodeExists = yield call(getFileNode, client, contentNode);
        if(!contentNodeExists) {
            let createResponse = yield call(createFileNode, client, contentNode);
            if(createResponse.error) {
                // TODO handle error
                // Error toast
            }
        }
        let metaNodeExists = yield call(getFileNode, client, metaNode);
        if(!metaNodeExists) {
            let createResponse = yield call(createFileNode, client, metaNode);
            if(createResponse.error) {
                // TODO handle error
            }
        }

        const subscriptions = yield fetchSubscriptions(client);
        let alreadySubscribedContent = find(subscriptions, function(sub) {
            return sub.node === contentNode;
        });
        let alreadySubscribedMeta = find(subscriptions, function(sub) {
            return sub.node === metaNode;
        });    
        
        const userJid = yield select(state => state.client.jid.bare);

        if(!alreadySubscribedContent) {
            client.subscribeToNode('pubsub.'+window.config.xmppDomain, {
                node: contentNode,
                jid: userJid
            });
        }

        if(!alreadySubscribedMeta) {
            client.subscribeToNode('pubsub.'+window.config.xmppDomain, {
                node: metaNode,
                jid: userJid
            });
        }

    });

}

function* watchLeaveRoom(client) {

    yield takeEvery(LEAVE_ROOM, function* unsubscribeFromRoomFileNodes(action) {

        let contentNode = 'snippets/' + action.payload.jid + '/content';
        let metaNode = 'snippets/' + action.payload.jid + '/metadata';
        const userJid = yield select(state => state.client.jid.bare);
        
        client.unsubscribeFromNode('pubsub.'+window.config.xmppDomain, {
            node: contentNode,
            jid: userJid
        });

        client.unsubscribeFromNode('pubsub.'+window.config.xmppDomain, {
            node: metaNode,
            jid: userJid
        });

    });

}

function* fetchSubscriptions(client) {
    const response = yield call([client, client.getSubscriptions], 'pubsub.'+window.config.xmppDomain);
    return response.pubsub.subscriptions.list;
}

function* getFileNode(client, node) {
    try {
        let response = yield call([client, client.getItem], 'pubsub.'+window.config.xmppDomain, node);
        return response.pubsub.retrieve.node;
    }
    catch(error) {
        console.log('error retrieving node', error);
        return null;
    }
}

function* createFileNode(client, node) {
    try {
        return yield call([client, client.createNode], 'pubsub.'+window.config.xmppDomain, node);
    }
    catch(error) {
        return error;
    }  
}

function* sendFile(client) {

    const successChannel = makeChannel(client, {
        "pubsub:event": (emit, msg) => {
            emit(msg)
        },
    });

    yield takeEvery(SEND_FILE, function* uploadFile(action) {

        let contentNode = 'snippets/' + action.payload.roomJid + '/content';
        let metaNode = 'snippets/' + action.payload.roomJid + '/metadata';

        yield call([client, client.publish], 
            'pubsub.'+window.config.xmppDomain, 
            contentNode, 
            {
                snippet: {
                    uri: action.payload.content
                } 
            }
        );

        const result = yield race({
            success: take(successChannel),
            timeout: delay(10000)
        });
      
        if (result.timeout) {
            // TODO action to explain timeout + suggest retry
            console.log('timed out!')
        }

        if(result.success) {

            const publishedFile = result.success.event.updated.published[0];
            const userJid = yield select(state => state.client.jid.bare);
            
            yield call([client, client.publish], 
                'pubsub.'+window.config.xmppDomain, 
                metaNode, 
                {
                    id: publishedFile.id,
                    metadata: buildContentMeta(action.payload.meta, userJid)
                }
            );  

            yield put(showToast('File uploaded', 'info'));

        }

    });

}

function buildContentMeta(meta, userJid) {
    return {
        name: meta.name,
        size: meta.size,
        type: meta.type,
        lastModified: meta.lastModified,
        author: userJid
    };
}

function* watchForFiles(client) {
    
    const channel = makeChannel(client, {
        "pubsub:event": (emit, msg) => {
            emit(msg);
        }
    });

    yield takeEvery(channel, function* eachForm(msg) {

        let updateEvent = msg.event.updated;

        if(!updateEvent.node.startsWith('snippets/')) {
            return;
        }

        if(updateEvent.node.endsWith('/content')) {

            let roomJid = updateEvent.node.replace("snippets/", "").replace("/content", "");
            yield put(receivedFile(roomJid, updateEvent.published[0].id, updateEvent.published[0].snippet.uri));

        } else if(msg.event.updated.node.endsWith('/metadata')) {

            let roomJid = msg.event.updated.node.replace("snippets/", "").replace("/metadata", "");
            yield put(receivedFileMeta(roomJid, updateEvent.published[0].id, updateEvent.published[0].metadata));

            // TODO this won't be me who sent the file...
            // TODO move this to when a file is actually sent!? in success...
            // Or fake the receivedMessage part...?
            // ITS IN THE META!!! author....
            yield call([client, client.sendMessage], {
                to: roomJid,
                type: 'groupchat',
                body: "File shared",
                references: [{
                    type: 'data',
                    uri: "urn:xmpp:snippets:0?node=" + updateEvent.node + '&item=' + updateEvent.published[0].id
                }]
            });

        }

    });
}

export default function*(client) {
  yield all([
      sendFile(client), 
      watchForFiles(client), 
      watchJoinRoom(client),
      watchLeaveRoom(client)
  ]);
}
